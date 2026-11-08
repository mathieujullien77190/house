import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { FULL_ZONE, isReduced, useZone } from './useZone'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchZones: vi.fn(),
  putZone: vi.fn(),
}))
const api = await import('./api')

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('useZone', () => {
  it('isReduced compare à toute l’image', () => {
    expect(isReduced(FULL_ZONE)).toBe(false)
    expect(isReduced([[0, 0]])).toBe(true)
    expect(
      isReduced([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0.5],
      ]),
    ).toBe(true)
  })
  it('lit la zone (ou toute l’image), enregistre au relâchement, remet à zéro', async () => {
    vi.mocked(api.fetchZones).mockResolvedValue({
      c: [
        [0, 0],
        [0.5, 0],
        [0.5, 0.5],
      ],
    })
    vi.mocked(api.putZone).mockResolvedValue(undefined)
    const { result } = renderHook(() => useZone('k', 'c'))
    await tick(0)
    expect(result.current.reduced).toBe(true)
    act(() => result.current.change(FULL_ZONE))
    expect(result.current.reduced).toBe(false)
    act(() =>
      result.current.commit([
        [0, 0],
        [1, 0],
        [1, 1],
      ]),
    )
    expect(api.putZone).toHaveBeenLastCalledWith('k', 'c', [
      [0, 0],
      [1, 0],
      [1, 1],
    ])
    act(() => result.current.commit(FULL_ZONE))
    expect(api.putZone).toHaveBeenLastCalledWith('k', 'c', null)
    act(() => result.current.reset())
    await tick(0)
    expect(result.current.failed).toBe(false)
  })
  it('caméra sans zone : toute l’image ; échec de lecture ignoré ; échec d’enregistrement signalé', async () => {
    vi.mocked(api.fetchZones).mockResolvedValue({})
    const { result } = renderHook(() => useZone('k', 'c'))
    await tick(0)
    expect(result.current.points).toBe(FULL_ZONE)
    vi.mocked(api.putZone).mockRejectedValue(new Error('x'))
    act(() => result.current.reset())
    await tick(0)
    expect(result.current.failed).toBe(true)
    vi.mocked(api.fetchZones).mockRejectedValue(new Error('x'))
    renderHook(() => useZone('k', 'd'))
    await tick(0)
  })
  it('ignore la lecture après démontage', async () => {
    let ok: (z: Record<string, never>) => void = () => undefined
    vi.mocked(api.fetchZones).mockReturnValue(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useZone('k', 'c'))
    unmount()
    await act(async () => {
      ok({ c: [[0, 0]] as never })
      await flush()
    })
    expect(result.current.points).toBe(FULL_ZONE)
  })
})
