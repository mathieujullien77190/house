import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { AcUnit } from '@/types'
import AcPreview from './AcPreview'
import { LOADING_TEXT, POLL_MS, UNKNOWN_TEXT } from './constants'

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

describe('AcPreview', () => {
  it('montre le chargement puis le bloc de la bonne unité', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit(), unit({ id: 'b', name: 'Chambre' })])
    render(<AcPreview apiKey="k" unitId="salon" />)
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
    await settle()
    expect(screen.getByText('Salon')).toBeInTheDocument()
    expect(screen.queryByText('Chambre')).toBeNull()
  })

  it('une unité absente de la liste le dit ; une lecture qui échoue laisse le chargement', async () => {
    vi.mocked(api.fetchAc).mockResolvedValueOnce([unit({ id: 'b' })])
    const first = render(<AcPreview apiKey="k" unitId="salon" />)
    await settle()
    expect(screen.getByText(UNKNOWN_TEXT)).toBeInTheDocument()
    first.unmount()
    vi.mocked(api.fetchAc).mockRejectedValueOnce(new Error('x'))
    render(<AcPreview apiKey="k" unitId="salon" />)
    await settle()
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
  })

  it('relit toutes les 10 s, s’arrête au démontage et ignore une réponse tardive', async () => {
    let ok: (units: AcUnit[]) => void = () => undefined
    vi.mocked(api.fetchAc).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    const { unmount } = render(<AcPreview apiKey="k" unitId="salon" />)
    unmount()
    await act(async () => {
      ok([unit()])
      await flush()
    })
    vi.mocked(api.fetchAc).mockResolvedValue([unit()])
    const second = render(<AcPreview apiKey="k" unitId="salon" />)
    await settle()
    await settle(POLL_MS)
    expect(api.fetchAc).toHaveBeenCalledTimes(3)
    second.unmount()
    await settle(POLL_MS)
    expect(api.fetchAc).toHaveBeenCalledTimes(3)
  })

  it('un ordre remplace l’unité par la réponse, les autres restent ; un échec le dit', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit(), unit({ id: 'b', name: 'Chambre' })])
    vi.mocked(api.setAc).mockResolvedValueOnce(unit({ power: false })).mockRejectedValueOnce(new Error('x'))
    render(<AcPreview apiKey="k" unitId="salon" />)
    await settle()
    fireEvent.click(screen.getByRole('switch'))
    await settle()
    expect(api.setAc).toHaveBeenCalledWith('k', 'salon', { on: false })
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(screen.getByRole('switch'))
    await settle()
    expect(screen.getByText(/L’ordre n’est pas parti/)).toBeInTheDocument()
  })
})
