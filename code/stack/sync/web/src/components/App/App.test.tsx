import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import { bridge, docker, dockerGlobal, link, overview, specs } from '@/lib/fixtures'
import type { FilteredPage, Row, System } from '@/types'
import App from '@/components/App'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchOverview: vi.fn(),
  fetchDocker: vi.fn(),
  fetchHue: vi.fn(),
  fetchNetwork: vi.fn(),
  fetchPower: vi.fn(),
  fetchCameraEnergy: vi.fn(),
  fetchSpecs: vi.fn(),
  fetchSystem: vi.fn(),
  fetchTable: vi.fn(),
  fetchClips: vi.fn(),
  fetchRetention: vi.fn(),
  fetchGuest: vi.fn(),
  fetchSettings: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}))
// Les rythmes de la page sont raccourcis pour que les essais n'attendent pas 15 s : le rafraîchissement toutes les 80 ms, les courbes toutes les 30 ms.
vi.mock('@/components/App/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/App/constants')>()),
  REFRESH_MS: 80,
  LIVE_MS: 30,
}))
const m = vi.mocked(api)

const system = (patch: Partial<System> = {}): System => ({
  memory: { total: 1000, available: 400 },
  cpu: { percent: 42, threads: 2, load1: 0.5, perThread: [10, 20] },
  ...patch,
})
const tablePage = (items: Row[]): FilteredPage<Row> => ({ items, total: items.length, page: 0, size: 20, options: [] })

const matchMedia = (matches: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }))
const wait = (ms: number) => act(async () => void (await new Promise((resolve) => setTimeout(resolve, ms))))
const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<T>((done, fail) => ((resolve = done), (reject = fail)))
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  matchMedia(true)
  m.fetchOverview.mockResolvedValue(overview())
  m.fetchDocker.mockResolvedValue(docker())
  m.fetchHue.mockResolvedValue(bridge())
  m.fetchNetwork.mockResolvedValue([link()])
  m.fetchPower.mockResolvedValue({ cpu: { watts: 10, ageSeconds: 1 }, cameras: [], camerasError: null })
  m.fetchCameraEnergy.mockResolvedValue({ since: '2026-11-08T12:00:00.000Z', cameras: [{ camera: 'cam', kwh: 0.5, cost: 0.08 }], total: { kwh: 0.5, cost: 0.08 } })
  m.fetchSpecs.mockResolvedValue(specs())
  m.fetchSystem.mockResolvedValue(system())
  m.fetchTable.mockResolvedValue(tablePage([{ id: 'e1', camera: 'cam', started_at: 5, clip_path: 'clips/cam/e1.mp4' }]))
  m.fetchClips.mockResolvedValue({ items: [], total: 0, page: 0, size: 20, options: [] })
  m.fetchRetention.mockResolvedValue(15)
  m.fetchGuest.mockResolvedValue({ guest_fps: 2, guest_enabled: true })
  m.fetchSettings.mockResolvedValue([])
  m.login.mockResolvedValue(undefined)
  m.logout.mockResolvedValue(undefined)
})

const tab = (name: string) => screen.getByRole('tab', { name })
const ready = async () => {
  render(<App />)
  await screen.findByText(/mis à jour/)
}
const goTo = async (name: string) => {
  fireEvent.click(tab(name))
  await waitFor(() => expect(tab(name).getAttribute('aria-selected')).toBe('true'))
}
const locked = () => new api.ApiError(401, 'connexion requise')
const signIn = async () => {
  await screen.findByText('Entrez votre clé.')
  fireEvent.change(screen.getByLabelText('Clé secrète'), { target: { value: 'ma-cle' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrer' }))
}

describe('connexion', () => {
  it('sans session : le formulaire de la clé, puis la page une fois la clé acceptée', async () => {
    m.fetchOverview.mockRejectedValueOnce(locked())
    render(<App />)
    await signIn()
    expect(await screen.findByText(/mis à jour/)).toBeTruthy()
    expect(m.login).toHaveBeenCalledWith('ma-cle')
    expect(screen.getByText('Base SQLite')).toBeTruthy()
  })

  it('une clé refusée : le message, et le formulaire reste', async () => {
    m.fetchOverview.mockRejectedValueOnce(locked())
    m.login.mockRejectedValueOnce(new api.ApiError(401, 'clé refusée'))
    render(<App />)
    await signIn()
    expect((await screen.findAllByText('clé refusée')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Clé secrète')).toBeTruthy()
  })

  it('House Sync injoignable au départ : le formulaire revient avec le message (une erreur qui n’est pas une Error aussi)', async () => {
    m.fetchOverview.mockRejectedValueOnce(new Error('HTTP 500'))
    const { unmount } = render(<App />)
    expect((await screen.findAllByText('HTTP 500')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Clé secrète')).toBeTruthy()
    unmount()
    m.fetchOverview.mockRejectedValueOnce('texte brut')
    render(<App />)
    expect((await screen.findAllByText('texte brut')).length).toBeGreaterThan(0)
  })

  it('Quitter ferme la session', async () => {
    await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }))
    expect(await screen.findByText('Entrez votre clé.')).toBeTruthy()
    expect(m.logout).toHaveBeenCalled()
  })

  it('un chargement parti avant « Quitter » ne rouvre pas la page quand il finit', async () => {
    await ready()
    const pending = deferred<ReturnType<typeof overview>>()
    m.fetchOverview.mockReturnValueOnce(pending.promise)
    await wait(120)
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }))
    await screen.findByText('Entrez votre clé.')
    await act(async () => pending.resolve(overview()))
    expect(screen.getByText('Entrez votre clé.')).toBeTruthy()
  })

  it('un chargement en échec parti avant « Quitter » est ignoré', async () => {
    await ready()
    const pending = deferred<ReturnType<typeof overview>>()
    m.fetchOverview.mockReturnValueOnce(pending.promise)
    await wait(120)
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }))
    await screen.findByText('Entrez votre clé.')
    await act(async () => pending.reject(new Error('tard')))
    expect(screen.queryByText('tard')).toBeNull()
  })

  it('un chargement de l’onglet Machine parti avant « Quitter » est ignoré', async () => {
    await ready()
    const pending = deferred<ReturnType<typeof overview>>()
    m.fetchOverview.mockReturnValue(pending.promise)
    fireEvent.click(tab('Machine'))
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }))
    await screen.findByText('Entrez votre clé.')
    await act(async () => pending.resolve(overview()))
    expect(screen.getByText('Entrez votre clé.')).toBeTruthy()
  })

  it('un chargement Docker parti avant « Quitter » est ignoré', async () => {
    await ready()
    const pendingDocker = deferred<ReturnType<typeof docker>>()
    m.fetchDocker.mockReturnValue(pendingDocker.promise)
    fireEvent.click(tab('Docker'))
    fireEvent.click(screen.getByRole('button', { name: 'Quitter' }))
    await screen.findByText('Entrez votre clé.')
    await act(async () => pendingDocker.resolve(docker()))
    expect(screen.getByText('Entrez votre clé.')).toBeTruthy()
  })
})

describe('rafraîchissement', () => {
  it('la page affichée est relue à intervalle régulier ; une session expirée ramène au formulaire', async () => {
    await ready()
    const calls = m.fetchOverview.mock.calls.length
    await wait(250)
    expect(m.fetchOverview.mock.calls.length).toBeGreaterThan(calls)
    m.fetchOverview.mockRejectedValue(locked())
    expect(await screen.findByText('Entrez votre clé.')).toBeTruthy()
  })

  it('une erreur passagère garde la page affichée, avec le message', async () => {
    await ready()
    m.fetchOverview.mockRejectedValue(new Error('coupure'))
    expect((await screen.findAllByText('coupure')).length).toBeGreaterThan(0)
    expect(screen.getByText('Base SQLite')).toBeTruthy()
  })

  it('un média ouvert suspend le rafraîchissement ; Fermer le reprend', async () => {
    await ready()
    fireEvent.click(screen.getAllByRole('button', { name: /Déplier/ })[0] as HTMLElement)
    fireEvent.click(await screen.findByRole('button', { name: 'voir' }))
    expect(await screen.findByRole('button', { name: 'Fermer' })).toBeTruthy()
    await wait(150)
    const calls = m.fetchOverview.mock.calls.length
    await wait(300)
    expect(m.fetchOverview.mock.calls.length).toBe(calls)
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    await wait(250)
    expect(m.fetchOverview.mock.calls.length).toBeGreaterThan(calls)
  })
})

describe('onglet Base et Disque', () => {
  it('Base : les tables de la base', async () => {
    await ready()
    expect(screen.getByText('events')).toBeTruthy()
    expect(m.fetchOverview).toHaveBeenLastCalledWith(false)
  })

  it('Base juste après une reconnexion : Chargement…, puis les tables', async () => {
    await ready()
    await goTo('Réglages')
    m.fetchOverview.mockRejectedValue(locked())
    await screen.findByText('Entrez votre clé.')
    m.fetchOverview.mockResolvedValue(overview())
    await signIn()
    await screen.findByText(/mis à jour/)
    const pending = deferred<ReturnType<typeof overview>>()
    m.fetchOverview.mockReturnValue(pending.promise)
    fireEvent.click(tab('Base'))
    expect(await screen.findByText('Chargement…')).toBeTruthy()
    await act(async () => pending.resolve(overview()))
    expect(await screen.findByText('Base SQLite')).toBeTruthy()
  })

  it('Disque : la liste des clips du disque backup', async () => {
    await ready()
    await goTo('Disque')
    expect(await screen.findByText('Disque backup')).toBeTruthy()
    expect(m.fetchClips).toHaveBeenCalled()
  })
})

describe('onglet Machine', () => {
  it('montre caractéristiques, disque, réseau, pont, adresses, courbes, camemberts et consommation', async () => {
    await ready()
    await goTo('Machine')
    expect(await screen.findByText('Caractéristiques')).toBeTruthy()
    expect(await screen.findByText('Place sur le disque')).toBeTruthy()
    expect(screen.getByText('Pont Hue')).toBeTruthy()
    expect(screen.getByText('Adresses IP de la maison')).toBeTruthy()
    expect(screen.getByText('En direct (2 dernières minutes)')).toBeTruthy()
    expect(screen.getByText('Consommation électrique')).toBeTruthy()
    expect(screen.getByText('Consommation des caméras (estimation)')).toBeTruthy()
    expect(screen.getAllByText('0,500 kWh')).toHaveLength(2)
    expect(screen.getByText('cam · 0,08 €')).toBeTruthy()
    expect(m.fetchOverview).toHaveBeenLastCalledWith(true)
  })

  it('chaque mesure qui manque est dite, le reste de la page marche', async () => {
    m.fetchPower.mockRejectedValue(new Error('x'))
    m.fetchCameraEnergy.mockRejectedValue(new Error('x'))
    m.fetchSystem.mockRejectedValue(new Error('x'))
    m.fetchSpecs.mockRejectedValue(new Error('x'))
    m.fetchNetwork.mockRejectedValue(new Error('x'))
    m.fetchHue.mockRejectedValue(new Error('x'))
    await ready()
    m.fetchOverview.mockResolvedValue(overview({ total: 0, free: 0, reserved: 0 }))
    await goTo('Machine')
    expect(await screen.findByText('Caractéristiques indisponibles.')).toBeTruthy()
    expect(screen.getByText('Réseau indisponible.')).toBeTruthy()
    expect(screen.getByText('Consommation indisponible.')).toBeTruthy()
    expect(screen.getByText('Énergie des caméras indisponible.')).toBeTruthy()
    expect(screen.getAllByText('Mesure indisponible.')).toHaveLength(2)
    expect(screen.queryByText('Place sur le disque')).toBeNull()
    expect(screen.queryByText('Pont Hue')).toBeNull()
  })

  it('un pont Hue sans adresse n’est pas montré', async () => {
    m.fetchHue.mockResolvedValue(bridge({ configured: false }))
    await ready()
    await goTo('Machine')
    await screen.findByText('Caractéristiques')
    expect(screen.queryByText('Pont Hue')).toBeNull()
  })

  it('une session expirée pendant le chargement ramène au formulaire', async () => {
    await ready()
    m.fetchSystem.mockRejectedValue(locked())
    fireEvent.click(tab('Machine'))
    expect(await screen.findByText('Entrez votre clé.')).toBeTruthy()
  })

  it('les courbes en direct : une mesure à chaque tour, une mesure perdue attend la suivante', async () => {
    await ready()
    await goTo('Machine')
    await screen.findByText('Caractéristiques')
    m.fetchSystem.mockReset()
    m.fetchSystem.mockRejectedValueOnce(new Error('perdue')).mockResolvedValue(system({ cpu: { percent: 80, threads: 2, load1: 1, perThread: [70, 90] } }))
    await wait(200)
    expect(screen.getAllByText('80 %').length).toBeGreaterThan(0)
    expect(screen.getByText('Thread 1')).toBeTruthy()
  })

  it('une mesure qui arrive après le changement d’onglet est ignorée', async () => {
    await ready()
    await goTo('Machine')
    await screen.findByText('Caractéristiques')
    const pending = deferred<System>()
    m.fetchSystem.mockReset()
    m.fetchSystem.mockReturnValueOnce(pending.promise).mockResolvedValue(system())
    await wait(60)
    fireEvent.click(tab('Docker'))
    await act(async () => pending.resolve(system({ cpu: { percent: 99, threads: 1, load1: 1, perThread: [99] } })))
    fireEvent.click(tab('Machine'))
    await screen.findByText('Caractéristiques')
    expect(screen.queryByText('99 %')).toBeNull()
  })

  it('sans processeur ni mémoire lus, les courbes affichent un tiret', async () => {
    m.fetchSystem.mockResolvedValue(system({ cpu: null, memory: null }))
    await ready()
    await goTo('Machine')
    await screen.findByText('Caractéristiques')
    expect(screen.getAllByText('—').length).toBeGreaterThan(1)
  })

  it('sur mobile, les caractéristiques commencent fermées', async () => {
    matchMedia(false)
    await ready()
    await goTo('Machine')
    const details = (await screen.findByText('Caractéristiques')).closest('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
  })

  it('sur bureau, elles commencent ouvertes', async () => {
    await ready()
    await goTo('Machine')
    const details = (await screen.findByText('Caractéristiques')).closest('details') as HTMLDetailsElement
    expect(details.open).toBe(true)
  })
})

describe('onglet Schéma', () => {
  it('affiche l’architecture matérielle puis logicielle', async () => {
    await ready()
    await goTo('Schéma')
    expect(await screen.findByText('Architecture matérielle')).toBeTruthy()
    expect(screen.getByText('Architecture logicielle')).toBeTruthy()
  })
})

describe('onglet Docker', () => {
  it('conteneurs, configuration globale et docker-compose.yml', async () => {
    await ready()
    await goTo('Docker')
    expect(await screen.findByText('Configuration globale')).toBeTruthy()
    expect(screen.getByText('docker-compose.yml')).toBeTruthy()
    expect(screen.getByText('house-sync')).toBeTruthy()
    expect(screen.getByText('house-api')).toBeTruthy()
    expect(screen.getByText('Réglages (.env)')).toBeTruthy()
  })

  it('service de l’hôte absent : la note le dit, sans configuration ni conteneurs', async () => {
    m.fetchDocker.mockResolvedValue(docker({ serviceAvailable: false, containers: [], global: null, compose: null }))
    await ready()
    await goTo('Docker')
    expect(await screen.findByText(/le service house-docker de l’hôte ne répond pas/)).toBeTruthy()
    expect(screen.queryByText('Configuration globale')).toBeNull()
    expect(screen.queryByText('docker-compose.yml')).toBeNull()
    expect(screen.queryByText('Conteneurs')).toBeNull()
  })

  it('une lecture Docker en échec : seulement la note', async () => {
    m.fetchDocker.mockRejectedValue(new Error('x'))
    await ready()
    await goTo('Docker')
    expect(await screen.findByText(/Lu par un service de l’hôte/)).toBeTruthy()
    expect(screen.queryByText('Conteneurs')).toBeNull()
  })

  it('une configuration globale sans le reste du moteur', async () => {
    m.fetchDocker.mockResolvedValue(docker({ global: dockerGlobal({ version: null }), compose: null }))
    await ready()
    await goTo('Docker')
    expect(await screen.findByText('Configuration globale')).toBeTruthy()
  })
})

describe('onglet Réglages', () => {
  it('affiche les réglages et ne relit que la session', async () => {
    await ready()
    await goTo('Réglages')
    expect(await screen.findByText('Général (toutes les caméras)')).toBeTruthy()
    expect(screen.getAllByText('Page invité').length).toBeGreaterThan(0)
    await waitFor(() => expect(m.fetchOverview).toHaveBeenLastCalledWith(false))
  })
})
