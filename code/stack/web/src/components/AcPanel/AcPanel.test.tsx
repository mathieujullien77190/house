import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { AcUnit } from '@/types'
import AcPanel from './AcPanel'
import { LOADING_TEXT, NOT_CONFIGURED_TEXT, POLL_MS, SEND_ERROR_TEXT, UNAVAILABLE_TEXT, UNIT_UNREACHABLE_TEXT } from './constants'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchAc: vi.fn(),
  setAc: vi.fn(),
}))
const api = await import('@/lib/api')

const unit = (over: Partial<AcUnit> = {}): AcUnit => ({
  id: 'salon',
  name: 'Salon',
  reachable: true,
  power: true,
  mode: 'heat',
  targetTemp: 21,
  roomTemp: 19,
  fan: 'auto',
  vane: 'auto',
  wideVane: 'center',
  ...over,
})

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('AcPanel', () => {
  it('montre le chargement puis un bloc par unité', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit(), unit({ id: 'b', name: 'Chambre' })])
    render(<AcPanel apiKey="k" />)
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
    await settle()
    expect(screen.queryByText(LOADING_TEXT)).toBeNull()
    expect(screen.getByText('Salon')).toBeInTheDocument()
    expect(screen.getByText('Chambre')).toBeInTheDocument()
    expect(api.fetchAc).toHaveBeenCalledWith('k')
  })

  it('un 503 dit qu’aucune climatisation n’est configurée', async () => {
    vi.mocked(api.fetchAc).mockRejectedValue(new api.ApiError(503, 'x'))
    render(<AcPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(NOT_CONFIGURED_TEXT)).toBeInTheDocument()
  })

  it('une autre erreur dit que les climatisations ne répondent pas', async () => {
    vi.mocked(api.fetchAc).mockRejectedValue(new Error('x'))
    render(<AcPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })

  it('relit toutes les 10 s et s’arrête au démontage', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit()])
    const { unmount } = render(<AcPanel apiKey="k" />)
    await settle()
    await settle(POLL_MS)
    expect(api.fetchAc).toHaveBeenCalledTimes(2)
    unmount()
    await settle(POLL_MS)
    expect(api.fetchAc).toHaveBeenCalledTimes(2)
  })

  it('ignore une réponse ou une erreur qui arrive après le démontage', async () => {
    let ok: (units: AcUnit[]) => void = () => undefined
    vi.mocked(api.fetchAc).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    render(<AcPanel apiKey="k" />).unmount()
    await act(async () => {
      ok([unit()])
      await flush()
    })
    let ko: (error: Error) => void = () => undefined
    vi.mocked(api.fetchAc).mockReturnValueOnce(new Promise((_, reject) => (ko = reject)))
    render(<AcPanel apiKey="k" />).unmount()
    await act(async () => {
      ko(new Error('x'))
      await flush()
    })
    expect(api.fetchAc).toHaveBeenCalledTimes(2)
  })

  it('un ordre part, la réponse remplace l’unité (les autres restent), puis le bouton se libère', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit(), unit({ id: 'b', name: 'Chambre', power: false })])
    let done: (value: AcUnit) => void = () => undefined
    vi.mocked(api.setAc).mockReturnValueOnce(new Promise((resolve) => (done = resolve)))
    render(<AcPanel apiKey="k" />)
    await settle()
    const [toggle] = screen.getAllByRole('switch', { name: 'Marche / arrêt' })
    fireEvent.click(toggle)
    expect(api.setAc).toHaveBeenCalledWith('k', 'salon', { on: false })
    expect(toggle).toBeDisabled()
    await act(async () => {
      done(unit({ power: false }))
      await flush()
    })
    expect(toggle).toBeEnabled()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Chambre')).toBeInTheDocument()
  })

  it('un ordre qui échoue le dit, le suivant efface le message', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit()])
    vi.mocked(api.setAc).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(unit({ mode: 'cool' }))
    render(<AcPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: '❄ Froid' }))
    await settle()
    expect(screen.getByText(SEND_ERROR_TEXT)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '❄ Froid' }))
    await settle()
    expect(screen.queryByText(SEND_ERROR_TEXT)).toBeNull()
  })

  it('la réponse d’un ordre arrivée après une lecture en échec est ignorée', async () => {
    vi.mocked(api.fetchAc).mockResolvedValueOnce([unit()]).mockRejectedValue(new Error('x'))
    let done: (value: AcUnit) => void = () => undefined
    vi.mocked(api.setAc).mockReturnValueOnce(new Promise((resolve) => (done = resolve)))
    render(<AcPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: '❄ Froid' }))
    await settle(POLL_MS)
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
    await act(async () => {
      done(unit({ mode: 'cool' }))
      await flush()
    })
    expect(screen.queryByText('Salon')).toBeNull()
  })

  it('une unité injoignable le dit sans commandes', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit({ reachable: false })])
    render(<AcPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(UNIT_UNREACHABLE_TEXT)).toBeInTheDocument()
    expect(screen.queryByRole('switch')).toBeNull()
  })
})
