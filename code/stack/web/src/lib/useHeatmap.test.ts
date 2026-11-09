import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { HeatmapStatus } from '@/types'
import { HEATMAP_POLL_MS, useHeatmap } from './useHeatmap'

vi.mock('./api', () => ({ fetchHeatmap: vi.fn() }))
const api = await import('./api')

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

const status = (over: Partial<HeatmapStatus> = {}): HeatmapStatus => ({
  cols: 1,
  rows: 1,
  thresholds: [1],
  pairs: 2,
  computing: false,
  done: 0,
  total: 0,
  levels: ['AAA='],
  ...over,
})

describe('useHeatmap', () => {
  it('éteinte : rien n’est demandé', async () => {
    const { result } = renderHook(() => useHeatmap('k', 'c', false))
    await tick(0)
    expect(api.fetchHeatmap).not.toHaveBeenCalled()
    expect(result.current).toEqual({ data: null, failed: false })
  })

  it('une carte prête : une seule demande', async () => {
    vi.mocked(api.fetchHeatmap).mockResolvedValue(status())
    const { result } = renderHook(() => useHeatmap('k', 'c', true))
    await tick(0)
    expect(api.fetchHeatmap).toHaveBeenCalledWith('k', 'c')
    expect(result.current.data?.pairs).toBe(2)
    await tick(HEATMAP_POLL_MS * 3)
    expect(api.fetchHeatmap).toHaveBeenCalledTimes(1)
  })

  it('relit tant que le calcul tourne, puis s’arrête', async () => {
    vi.mocked(api.fetchHeatmap).mockReset()
    vi.mocked(api.fetchHeatmap)
      .mockResolvedValueOnce(status({ computing: true, done: 1, total: 4 }))
      .mockResolvedValue(status({ pairs: 9 }))
    const { result } = renderHook(() => useHeatmap('k', 'c', true))
    await tick(0)
    expect(result.current.data?.computing).toBe(true)
    await tick(HEATMAP_POLL_MS)
    expect(result.current.data?.pairs).toBe(9)
    await tick(HEATMAP_POLL_MS * 3)
    expect(api.fetchHeatmap).toHaveBeenCalledTimes(2)
  })

  it('un échec est signalé et réessayé ; la reprise efface l’échec', async () => {
    vi.mocked(api.fetchHeatmap).mockReset()
    vi.mocked(api.fetchHeatmap).mockRejectedValueOnce(new Error('x')).mockResolvedValue(status())
    const { result } = renderHook(() => useHeatmap('k', 'c', true))
    await tick(0)
    expect(result.current.failed).toBe(true)
    await tick(HEATMAP_POLL_MS)
    expect(result.current.failed).toBe(false)
    expect(result.current.data).not.toBeNull()
  })

  it('après démontage, les réponses sont ignorées et plus rien n’est relu', async () => {
    vi.mocked(api.fetchHeatmap).mockReset()
    let ok: (s: HeatmapStatus) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchHeatmap)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_resolve, reject) => (ko = reject)))
    renderHook(() => useHeatmap('k', 'c', true)).unmount()
    renderHook(() => useHeatmap('k', 'c', true)).unmount()
    await act(async () => {
      ok(status({ computing: true }))
      ko(new Error('x'))
      await flush()
    })
    await tick(HEATMAP_POLL_MS * 2)
    expect(api.fetchHeatmap).toHaveBeenCalledTimes(2)
  })
})
