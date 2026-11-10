import { act, renderHook } from '@testing-library/react'
import type { AcUnit } from '@/types'
import * as api from '@/lib/api'
import { useAcUnits } from './useAcUnits'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchAc: vi.fn(),
  setAc: vi.fn(),
}))

const unit = (patch: Partial<AcUnit> = {}): AcUnit =>
  ({
    id: 'salon',
    name: 'Salon',
    reachable: true,
    power: true,
    mode: 'heat',
    targetTemp: 21,
    roomTemp: 20,
    fan: 'auto',
    vane: 'auto',
    wideVane: null,
    ...patch,
  }) as AcUnit
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => vi.clearAllMocks())

describe('useAcUnits', () => {
  it('lit les unités ; avant la réponse : loading, ensuite rien à signaler', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit()])
    const { result } = renderHook(() => useAcUnits('k'))
    expect(result.current.units).toBeNull()
    expect(result.current.problem).toBe('loading')
    await act(flush)
    expect(result.current.units).toHaveLength(1)
    expect(result.current.problem).toBeNull()
  })

  it('un 503 dit « aucune unité configurée », une autre erreur « l’API ne répond pas » ; la dernière liste lue est gardée', async () => {
    vi.mocked(api.fetchAc).mockRejectedValueOnce(new api.ApiError(503, 'x'))
    const { result, unmount } = renderHook(() => useAcUnits('k'))
    await act(flush)
    expect(result.current.problem).toBe('none')
    expect(result.current.units).toBeNull()
    unmount()
    vi.mocked(api.fetchAc).mockResolvedValueOnce([unit()]).mockRejectedValueOnce(new Error('x'))
    vi.useFakeTimers()
    const second = renderHook(() => useAcUnits('k'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(second.result.current.units).toHaveLength(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(second.result.current.problem).toBe('off')
    expect(second.result.current.units).toHaveLength(1)
    vi.useRealTimers()
  })

  it('une réponse qui arrive après le démontage est ignorée', async () => {
    let answer: (list: AcUnit[]) => void = () => undefined
    vi.mocked(api.fetchAc).mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result, unmount } = renderHook(() => useAcUnits('k'))
    unmount()
    answer([unit()])
    await act(flush)
    expect(result.current.units).toBeNull()
    // une erreur après le démontage aussi
    let fail: (error: Error) => void = () => undefined
    vi.mocked(api.fetchAc).mockReturnValue(new Promise((_resolve, reject) => (fail = reject)))
    const other = renderHook(() => useAcUnits('k'))
    other.unmount()
    fail(new Error('x'))
    await act(flush)
    expect(other.result.current.problem).toBe('loading')
  })

  it('un ordre : l’unité est occupée, la réponse de l’API la remplace ; un échec le dit ; sans liste lue, la réponse est ignorée', async () => {
    vi.mocked(api.fetchAc).mockResolvedValue([unit(), unit({ id: 'autre', name: 'Autre' })])
    vi.mocked(api.setAc)
      .mockResolvedValueOnce(unit({ power: false }))
      .mockRejectedValueOnce(new Error('x'))
    const { result } = renderHook(() => useAcUnits('k'))
    await act(flush)
    act(() => result.current.change('salon', { on: false }))
    expect(result.current.busy).toBe('salon')
    await act(flush)
    expect(result.current.busy).toBeNull()
    expect(result.current.units?.[0].power).toBe(false)
    expect(result.current.units?.[1].power).toBe(true)
    act(() => result.current.change('salon', { on: true }))
    await act(flush)
    expect(result.current.failed).toBe('salon')

    // un ordre donné avant la première lecture : la réponse n'a pas de liste où se poser
    vi.mocked(api.fetchAc).mockReturnValue(new Promise(() => undefined))
    vi.mocked(api.setAc).mockResolvedValueOnce(unit())
    const early = renderHook(() => useAcUnits('k'))
    act(() => early.result.current.change('salon', { on: true }))
    await act(flush)
    expect(early.result.current.units).toBeNull()
    expect(early.result.current.failed).toBeNull()
  })
})
