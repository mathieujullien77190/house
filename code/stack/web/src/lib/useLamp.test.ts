import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { useLamp } from './useLamp'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchLights: vi.fn(),
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

describe('useLamp', () => {
  const rooms = [{ id: 'r', name: 'R', on: true, bri: 1, lights: [{ id: '26', name: 'P', on: true, bri: 10, reachable: true }] }]
  it('inactif ou sans identifiant : null', async () => {
    const { result } = renderHook(() => useLamp('k', undefined, true))
    renderHook(() => useLamp('k', '26', false))
    await tick(5000)
    expect(result.current).toBeNull()
    expect(api.fetchLights).not.toHaveBeenCalled()
  })
  it('trouve la lampe, null si absente, garde l’état si échec', async () => {
    vi.mocked(api.fetchLights).mockResolvedValue(rooms as never)
    const { result, rerender, unmount } = renderHook(({ id }) => useLamp('k', id, true), { initialProps: { id: '26' } })
    await tick(0)
    expect(result.current?.name).toBe('P')
    rerender({ id: '99' })
    await tick(0)
    expect(result.current).toBeNull()
    vi.mocked(api.fetchLights).mockRejectedValue(new Error('x'))
    await tick(5000)
    expect(result.current).toBeNull()
    unmount()
  })
  it('ignore une réponse après démontage', async () => {
    let ok: (r: never) => void = () => undefined
    vi.mocked(api.fetchLights).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useLamp('k', '26', true))
    unmount()
    await act(async () => {
      ok(rooms as never)
      await flush()
    })
    expect(result.current).toBeNull()
  })
})
