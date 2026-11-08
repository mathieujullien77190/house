import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { useLampCount } from './useLampCount'

vi.mock('@/lib/api', () => ({ fetchLights: vi.fn() }))
const api = await import('@/lib/api')
const rooms = [{ id: 'r', name: 'R', on: true, bri: 1, lights: [{ id: '15', name: 'a', on: true, bri: 1, reachable: true }] }]

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())
const tick = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('useLampCount', () => {
  it('inactif : null', async () => {
    const { result } = renderHook(() => useLampCount('k', false))
    await tick(60_000)
    expect(result.current).toBeNull()
  })
  it('compte les lampes placées, relit chaque minute, null en cas d’échec', async () => {
    vi.mocked(api.fetchLights).mockResolvedValue(rooms as never)
    const { result, unmount } = renderHook(() => useLampCount('k', true))
    await tick(0)
    expect(result.current).toBe(1)
    vi.mocked(api.fetchLights).mockRejectedValue(new Error('x'))
    await tick(60_000)
    expect(result.current).toBeNull()
    unmount()
  })
  it('ignore les réponses après démontage', async () => {
    let ok: (r: never) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchLights)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const { result, unmount } = renderHook(() => useLampCount('k', true))
    await tick(60_000)
    unmount()
    await act(async () => {
      ok(rooms as never)
      ko(new Error('x'))
      await flush()
    })
    expect(result.current).toBeNull()
  })
})
