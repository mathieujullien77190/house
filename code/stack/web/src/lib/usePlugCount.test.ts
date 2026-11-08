import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { usePlugCount } from './usePlugCount'

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

describe('usePlugCount', () => {
  it('inactif : rien', async () => {
    renderHook(() => usePlugCount('k', false))
    await tick(60_000)
    expect(api.fetchPlug).not.toHaveBeenCalled()
  })
  it('1 tant que la prise répond, null sinon', async () => {
    vi.mocked(api.fetchPlug).mockResolvedValue({} as never)
    const { result, unmount } = renderHook(() => usePlugCount('k', true))
    await tick(0)
    expect(result.current).toBe(1)
    vi.mocked(api.fetchPlug).mockRejectedValue(new Error('x'))
    await tick(60_000)
    expect(result.current).toBeNull()
    unmount()
  })
  it('ignore les réponses après démontage', async () => {
    let ok: (s: never) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchPlug)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const { result, unmount } = renderHook(() => usePlugCount('k', true))
    await tick(60_000)
    unmount()
    await act(async () => {
      ok({} as never)
      ko(new Error('x'))
      await flush()
    })
    expect(result.current).toBeNull()
  })
})
