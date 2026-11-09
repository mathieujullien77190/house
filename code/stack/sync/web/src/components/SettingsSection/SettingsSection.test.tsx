import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import SettingsSection from '@/components/SettingsSection'
import type { CameraSetting } from '@/components/SettingsSection'

vi.mock('@/lib/api', () => ({
  fetchRetention: vi.fn(),
  fetchGuest: vi.fn(),
  fetchSettings: vi.fn(),
  saveRetention: vi.fn(),
  saveGuest: vi.fn(),
  saveSetting: vi.fn(),
}))
const m = vi.mocked(api)

const camera = (patch: Partial<CameraSetting> = {}): CameraSetting => ({
  camera: 'voliere-exterieur',
  clips_mode: 'always',
  orientation: 'landscape',
  live_fps: 25,
  light_fps: 10,
  live_fps_mobile: 25,
  light_fps_mobile: 5,
  motion_sensitivity: 3,
  snapshot_seconds: 60,
  ...patch,
})
const RAIN_GROUP = 'Mode pluie (si la météo dit pluie : pas de clips, une image toutes les 5 s)'
const SAVE_ERROR = /n’a pas pu être enregistré/

beforeEach(() => {
  vi.resetAllMocks()
  m.fetchRetention.mockResolvedValue(15)
  m.fetchGuest.mockResolvedValue({ guest_fps: 2, guest_enabled: true })
  m.fetchSettings.mockResolvedValue([camera()])
})

const loaded = async () => {
  render(<SettingsSection />)
  await screen.findByText('normale')
}
const tab = (group: string, name: string) => within(screen.getByRole('tablist', { name: group })).getByRole('tab', { name })
const slider = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const release = (input: HTMLInputElement, value: string) => {
  fireEvent.change(input, { target: { value } })
  fireEvent.pointerUp(input)
}

describe('chargement', () => {
  it('montre les réglages lus : durée de garde, caméras, page invité', async () => {
    await loaded()
    expect(screen.getAllByText('voliere-exterieur')[0]).toBeTruthy()
    expect(tab('Durée de garde des clips (toutes les caméras)', '15 jours').getAttribute('aria-selected')).toBe('true')
    expect(tab('Clips vidéo', 'Toujours').getAttribute('aria-selected')).toBe('true')
    expect(tab('Orientation', 'Paysage').getAttribute('aria-selected')).toBe('true')
    expect(tab('Une image toutes les', '1 min').getAttribute('aria-selected')).toBe('true')
    expect(tab('Page invité', 'En ligne').getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByText('toutes')).toHaveLength(2)
    expect(screen.getByText('10 images/s')).toBeTruthy()
    expect(screen.getByText('2 images/s')).toBeTruthy()
  })

  it('la page invité coupée', async () => {
    m.fetchGuest.mockResolvedValue({ guest_fps: 2, guest_enabled: false })
    await loaded()
    expect(tab('Page invité', 'Coupée').getAttribute('aria-selected')).toBe('true')
  })

  it('des réglages illisibles : un message', async () => {
    m.fetchRetention.mockRejectedValue(new Error('x'))
    m.fetchGuest.mockRejectedValue(new Error('x'))
    m.fetchSettings.mockRejectedValue(new Error('x'))
    render(<SettingsSection />)
    expect(await screen.findByText('Les réglages n’ont pas pu être lus.')).toBeTruthy()
  })

  it('une réponse qui arrive après le démontage est ignorée', async () => {
    const later = <T,>() => {
      let resolve: (value: T) => void = () => undefined
      let reject: (error: Error) => void = () => undefined
      const promise = new Promise<T>((done, fail) => ((resolve = done), (reject = fail)))
      return { promise, resolve, reject }
    }
    const retention = later<number>()
    const guest = later<{ guest_fps: number; guest_enabled: boolean }>()
    const settings = later<CameraSetting[]>()
    m.fetchRetention.mockReturnValue(retention.promise)
    m.fetchGuest.mockReturnValue(guest.promise)
    m.fetchSettings.mockReturnValue(settings.promise)
    const { unmount } = render(<SettingsSection />)
    unmount()
    await act(async () => {
      retention.resolve(30)
      guest.resolve({ guest_fps: 3, guest_enabled: true })
      settings.resolve([])
    })
    const again = later<number>()
    m.fetchRetention.mockReturnValue(again.promise)
    const second = render(<SettingsSection />)
    second.unmount()
    await act(async () => again.reject(new Error('tard')))
  })
})

describe('durée de garde', () => {
  it('un clic l’enregistre', async () => {
    m.saveRetention.mockResolvedValue(30)
    await loaded()
    fireEvent.click(tab('Durée de garde des clips (toutes les caméras)', '30 jours'))
    await waitFor(() => expect(tab('Durée de garde des clips (toutes les caméras)', '30 jours').getAttribute('aria-selected')).toBe('true'))
    expect(m.saveRetention).toHaveBeenCalledWith(30)
  })

  it('un échec le dit', async () => {
    m.saveRetention.mockRejectedValue(new Error('x'))
    await loaded()
    fireEvent.click(tab('Durée de garde des clips (toutes les caméras)', '30 jours'))
    expect(await screen.findByText(SAVE_ERROR)).toBeTruthy()
  })
})

describe('réglages par caméra', () => {
  it('clips, orientation et rythme des images s’enregistrent au clic', async () => {
    m.saveSetting.mockImplementation(async (name, patch) => camera({ camera: name, ...patch }))
    await loaded()
    fireEvent.click(tab('Clips vidéo', 'La nuit'))
    await waitFor(() => expect(tab('Clips vidéo', 'La nuit').getAttribute('aria-selected')).toBe('true'))
    fireEvent.click(tab('Orientation', 'Portrait'))
    await waitFor(() => expect(tab('Orientation', 'Portrait').getAttribute('aria-selected')).toBe('true'))
    fireEvent.click(tab('Une image toutes les', '5 min'))
    await waitFor(() => expect(m.saveSetting).toHaveBeenCalledWith('voliere-exterieur', { snapshot_seconds: 300 }))
    expect(m.saveSetting).toHaveBeenCalledWith('voliere-exterieur', { clips_mode: 'night' })
    expect(m.saveSetting).toHaveBeenCalledWith('voliere-exterieur', { orientation: 'portrait' })
  })

  it('le mode pluie s’allume et s’éteint au clic, éteint tant que la caméra ne dit rien', async () => {
    m.saveSetting.mockImplementation(async (name, patch) => camera({ camera: name, ...patch }))
    await loaded()
    expect(tab(RAIN_GROUP, 'OFF').getAttribute('aria-selected')).toBe('true')
    fireEvent.click(tab(RAIN_GROUP, 'ON'))
    await waitFor(() => expect(tab(RAIN_GROUP, 'ON').getAttribute('aria-selected')).toBe('true'))
    expect(m.saveSetting).toHaveBeenCalledWith('voliere-exterieur', { rain_mode: 'on' })
  })

  it('le mode pluie dit ce qui est actif en ce moment : pluie, pluie forte, ou rien', async () => {
    m.fetchSettings.mockResolvedValue([camera({ rain_mode: 'on', rain_now: 'rain' }), camera({ camera: 'b', rain_mode: 'on', rain_now: 'heavy' }), camera({ camera: 'c', rain_mode: 'on', rain_now: 'off' })])
    render(<SettingsSection />)
    expect(await screen.findByText(/Pluie en ce moment/)).toBeTruthy()
    expect(screen.getByText(/Pluie forte en ce moment/)).toBeTruthy()
    expect(screen.getAllByText(/en ce moment/)).toHaveLength(2)
  })

  it('l’enregistrement d’un autre appareil laisse les autres caméras intactes', async () => {
    m.fetchSettings.mockResolvedValue([camera(), camera({ camera: 'voliere-interieur' })])
    m.saveSetting.mockImplementation(async (name, patch) => camera({ camera: name, ...patch }))
    render(<SettingsSection />)
    await screen.findAllByText('voliere-interieur')
    fireEvent.click(within(screen.getAllByRole('tablist', { name: 'Clips vidéo' })[1] as HTMLElement).getByRole('tab', { name: 'Jamais' }))
    await waitFor(() => expect(within(screen.getAllByRole('tablist', { name: 'Clips vidéo' })[1] as HTMLElement).getByRole('tab', { name: 'Jamais' }).getAttribute('aria-selected')).toBe('true'))
    expect(within(screen.getAllByRole('tablist', { name: 'Clips vidéo' })[0] as HTMLElement).getByRole('tab', { name: 'Toujours' }).getAttribute('aria-selected')).toBe('true')
  })

  it('un échec le dit, et un enregistrement réussi efface le message', async () => {
    m.saveSetting.mockRejectedValueOnce(new Error('x')).mockImplementation(async (name, patch) => camera({ camera: name, ...patch }))
    await loaded()
    fireEvent.click(tab('Clips vidéo', 'Jamais'))
    expect(await screen.findByText(SAVE_ERROR)).toBeTruthy()
    fireEvent.click(tab('Clips vidéo', 'La nuit'))
    await waitFor(() => expect(screen.queryByText(SAVE_ERROR)).toBeNull())
  })
})

describe('curseurs', () => {
  it('la sensibilité est envoyée au relâchement, seulement si elle a changé', async () => {
    m.saveSetting.mockImplementation(async (name, patch) => camera({ camera: name, ...patch }))
    await loaded()
    const input = slider('Sensibilité du mouvement · voliere-exterieur')
    fireEvent.change(input, { target: { value: '5' } })
    expect(screen.getByText('très élevée')).toBeTruthy()
    expect(m.saveSetting).not.toHaveBeenCalled()
    fireEvent.pointerUp(input)
    await waitFor(() => expect(m.saveSetting).toHaveBeenCalledWith('voliere-exterieur', { motion_sensitivity: 5 }))
    await waitFor(() => expect(screen.getByText('très élevée')).toBeTruthy())
    // Relâcher sans avoir bougé n’envoie rien.
    release(input, '5')
    fireEvent.change(input, { target: { value: '4' } })
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.keyUp(input)
    expect(m.saveSetting).toHaveBeenCalledTimes(1)
  })

  it('la cadence du direct : « toutes » à 25, envoyée au relâchement, clavier compris', async () => {
    m.saveSetting.mockImplementation(async (name, patch) => camera({ camera: name, ...patch }))
    await loaded()
    const input = slider('Direct 4K · PC · voliere-exterieur')
    fireEvent.change(input, { target: { value: '12' } })
    expect(screen.getByText('12 images/s')).toBeTruthy()
    fireEvent.keyUp(input)
    await waitFor(() => expect(m.saveSetting).toHaveBeenCalledWith('voliere-exterieur', { live_fps: 12 }))
    await waitFor(() => expect(screen.getAllByText('12 images/s').length).toBeGreaterThan(0))
  })

  it('un curseur dont l’enregistrement échoue revient à la valeur gardée', async () => {
    m.saveSetting.mockRejectedValue(new Error('x'))
    await loaded()
    const input = slider('Direct léger · PC · voliere-exterieur')
    release(input, '3')
    expect(await screen.findByText(SAVE_ERROR)).toBeTruthy()
    await waitFor(() => expect(slider('Direct léger · PC · voliere-exterieur').value).toBe('10'))
  })
})

describe('page invité', () => {
  const GUEST_FPS = 'Page invité · images par seconde (toutes les caméras, PC et téléphone)'

  it('l’interrupteur coupe puis remet la page', async () => {
    m.saveGuest.mockResolvedValueOnce({ guest_fps: 2, guest_enabled: false }).mockResolvedValueOnce({ guest_fps: 2, guest_enabled: true })
    await loaded()
    fireEvent.click(tab('Page invité', 'Coupée'))
    await waitFor(() => expect(tab('Page invité', 'Coupée').getAttribute('aria-selected')).toBe('true'))
    expect(m.saveGuest).toHaveBeenCalledWith({ guest_enabled: false })
    fireEvent.click(tab('Page invité', 'En ligne'))
    await waitFor(() => expect(tab('Page invité', 'En ligne').getAttribute('aria-selected')).toBe('true'))
  })

  it('un échec de l’interrupteur le dit', async () => {
    m.saveGuest.mockRejectedValue(new Error('x'))
    await loaded()
    fireEvent.click(tab('Page invité', 'Coupée'))
    expect(await screen.findByText(SAVE_ERROR)).toBeTruthy()
  })

  it('le curseur est envoyé au relâchement s’il a changé', async () => {
    m.saveGuest.mockResolvedValue({ guest_fps: 8, guest_enabled: true })
    await loaded()
    const input = slider(GUEST_FPS)
    fireEvent.change(input, { target: { value: '8' } })
    expect(screen.getByText('8 images/s')).toBeTruthy()
    fireEvent.pointerUp(input)
    await waitFor(() => expect(m.saveGuest).toHaveBeenCalledWith({ guest_fps: 8 }))
    await waitFor(() => expect(slider(GUEST_FPS).value).toBe('8'))
  })

  it('le curseur se relâche aussi au clavier', async () => {
    m.saveGuest.mockResolvedValue({ guest_fps: 6, guest_enabled: true })
    await loaded()
    fireEvent.change(slider(GUEST_FPS), { target: { value: '6' } })
    fireEvent.keyUp(slider(GUEST_FPS))
    await waitFor(() => expect(m.saveGuest).toHaveBeenCalledWith({ guest_fps: 6 }))
  })

  it('relâché sans changement : rien n’est envoyé ; en cas d’échec il revient à la valeur gardée', async () => {
    await loaded()
    release(slider(GUEST_FPS), '2')
    expect(m.saveGuest).not.toHaveBeenCalled()
    m.saveGuest.mockRejectedValue(new Error('x'))
    release(slider(GUEST_FPS), '9')
    expect(await screen.findByText(SAVE_ERROR)).toBeTruthy()
    await waitFor(() => expect(slider(GUEST_FPS).value).toBe('2'))
  })
})
