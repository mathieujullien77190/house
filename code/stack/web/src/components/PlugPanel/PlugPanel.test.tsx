import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { PlugState } from '@/types'
import PlugPanel from './PlugPanel'
import { NOT_CONFIGURED_TEXT, UNAVAILABLE_TEXT, LOADING_TEXT } from './constants'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchPlug: vi.fn(),
  setPlug: vi.fn(),
}))
const api = await import('@/lib/api')

const plug = (over: Partial<PlugState> = {}): PlugState => ({
  alias: 'chauffage',
  model: 'HS100',
  on: true,
  rssi: -55,
  onTime: 205,
  timerSeconds: 754,
  offOnMotion: false,
  ...over,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000_000)
})
afterEach(() => vi.useRealTimers())

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('PlugPanel', () => {
  it('montre le chargement puis l’état de la prise', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug())
    render(<PlugPanel apiKey="k" />)
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
    await settle()
    expect(screen.getByText('chauffage')).toBeInTheDocument()
    expect(screen.getByText('HS100')).toBeInTheDocument()
    expect(screen.getByText('12 min 34 s')).toBeInTheDocument()
    expect(screen.getByText('3 min 25 s')).toBeInTheDocument()
    expect(screen.getByText(/bon \(-55 dBm\)/)).toBeInTheDocument()
    expect(screen.queryByText('oui, au prochain mouvement')).toBeNull()
  })

  it('le décompte défile chaque seconde', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug())
    render(<PlugPanel apiKey="k" />)
    await settle()
    await settle(1000)
    expect(screen.getByText('12 min 33 s')).toBeInTheDocument()
    expect(screen.getByText('3 min 26 s')).toBeInTheDocument()
  })

  it('éteinte : pas de bouton Éteindre, ni décompte ; sans minuteur : pas de ligne', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug({ on: false, timerSeconds: null }))
    render(<PlugPanel apiKey="k" />)
    await settle()
    expect(screen.queryByRole('button', { name: 'Éteindre' })).toBeNull()
    expect(screen.queryByText(/S’éteint dans/)).toBeNull()
  })

  it('allumée sans minuteur, éteinte au mouvement armée', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug({ timerSeconds: null, offOnMotion: true }))
    render(<PlugPanel apiKey="k" />)
    await settle()
    expect(screen.queryByText(/S’éteint dans/)).toBeNull()
    expect(screen.getByText('oui, au prochain mouvement')).toBeInTheDocument()
  })

  it('503 : pas de prise configurée ; autre échec : prise injoignable', async () => {
    vi.mocked(api.fetchPlug).mockRejectedValue(new api.ApiError(503, 'x'))
    const first = render(<PlugPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(NOT_CONFIGURED_TEXT)).toBeInTheDocument()
    first.unmount()
    vi.mocked(api.fetchPlug).mockRejectedValue(new Error('x'))
    render(<PlugPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })

  it('relit toutes les 5 s et oublie la prise si elle disparaît', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug())
    render(<PlugPanel apiKey="k" />)
    await settle()
    vi.mocked(api.fetchPlug).mockRejectedValue(new Error('x'))
    await settle(5000)
    expect(screen.queryByText('chauffage')).toBeNull()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })

  it('ignore les réponses arrivées après le démontage', async () => {
    let ok: (p: PlugState) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchPlug)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const { unmount } = render(<PlugPanel apiKey="k" />)
    await settle(5000)
    unmount()
    await act(async () => {
      ok(plug())
      ko(new Error('x'))
      await flush()
    })
  })

  it('« Éteindre » éteint la prise', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug())
    vi.mocked(api.setPlug).mockResolvedValue(plug({ on: false, timerSeconds: null }))
    render(<PlugPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Éteindre' }))
    // pendant l'appel, le bouton est désactivé : un second clic ne fait rien
    expect(screen.getByRole('button', { name: 'Éteindre' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Éteindre' }))
    await settle()
    expect(api.setPlug).toHaveBeenCalledTimes(1)
    expect(api.setPlug).toHaveBeenCalledWith('k', false)
    expect(screen.queryByRole('button', { name: 'Éteindre' })).toBeNull()
  })

  it('un échec à l’extinction signale que la prise ne répond pas', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug())
    vi.mocked(api.setPlug).mockRejectedValue(new Error('x'))
    render(<PlugPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'Éteindre' }))
    await settle()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })

  it('le curseur règle la durée et « Allumer pendant » l’envoie avec la case du mouvement', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug({ on: false, timerSeconds: null }))
    vi.mocked(api.setPlug).mockResolvedValue(plug())
    render(<PlugPanel apiKey="k" />)
    await settle()
    expect(screen.getByRole('button', { name: /Allumer pendant 5 min/ })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Allumer pendant 12 min/ }))
    fireEvent.click(screen.getByRole('button', { name: /Allumer pendant 12 min/ }))
    await settle()
    expect(api.setPlug).toHaveBeenCalledTimes(1)
    expect(api.setPlug).toHaveBeenCalledWith('k', true, 12, false)
  })

  it('un échec à l’allumage signale que la prise ne répond pas', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(plug({ on: false, timerSeconds: null }))
    vi.mocked(api.setPlug).mockRejectedValue(new Error('x'))
    render(<PlugPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: /Allumer pendant/ }))
    await settle()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })
})
