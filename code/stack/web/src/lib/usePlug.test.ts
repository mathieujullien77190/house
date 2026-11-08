import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { usePlug } from './usePlug'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchPlug: vi.fn(),
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

describe('usePlug', () => {
  const state = { alias: 'p', on: true } as never
  it('ne lit rien tant qu’inactif', async () => {
    renderHook(() => usePlug('k', false))
    await tick(10_000)
    expect(api.fetchPlug).not.toHaveBeenCalled()
  })
  it('lit, relit, repasse à null en cas d’échec, et s’arrête au démontage', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue(state)
    const { result, unmount } = renderHook(() => usePlug('k', true))
    await tick(0)
    expect(result.current).toBe(state)
    vi.mocked(api.fetchPlug).mockRejectedValue(new Error('x'))
    await tick(5000)
    expect(result.current).toBeNull()
    unmount()
    const calls = vi.mocked(api.fetchPlug).mock.calls.length
    await tick(10_000)
    expect(vi.mocked(api.fetchPlug).mock.calls.length).toBe(calls)
  })
  it('ignore les réponses arrivées après le démontage', async () => {
    let ok: (s: never) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchPlug)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const { result, unmount } = renderHook(() => usePlug('k', true))
    await tick(5000)
    unmount()
    await act(async () => {
      ok(state)
      ko(new Error('x'))
      await flush()
    })
    expect(result.current).toBeNull()
  })
})
