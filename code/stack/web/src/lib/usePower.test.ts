import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { ApiError } from './api'
import { usePower } from './usePower'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  fetchPower: vi.fn(),
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

describe('usePower', () => {
  const base = { camera: 'c', port: 1, on: true, powered: true, watts: 5, streaming: true }
  it('lit l’alimentation de la caméra', async () => {
    vi.mocked(api.fetchPower).mockResolvedValue([base])
    const { result } = renderHook(() => usePower('k', 'c'))
    await tick(0)
    expect(result.current.power).toEqual(base)
    expect(result.current.failed).toBe(false)
  })
  it('caméra absente de la liste : null', async () => {
    vi.mocked(api.fetchPower).mockResolvedValue([])
    const { result } = renderHook(() => usePower('k', 'c'))
    await tick(0)
    expect(result.current.power).toBeNull()
  })
  it('échec : 503 = rien à montrer, autre = échec ; le dernier état reste', async () => {
    vi.mocked(api.fetchPower).mockRejectedValue(new ApiError(503, 'x'))
    const { result } = renderHook(() => usePower('k', 'c'))
    await tick(0)
    expect(result.current.failed).toBe(false)
    vi.mocked(api.fetchPower).mockRejectedValue(new Error('x'))
    await tick(10_000)
    expect(result.current.failed).toBe(true)
  })
  it('relit plus vite pendant un démarrage et une extinction', async () => {
    vi.mocked(api.fetchPower).mockResolvedValue([{ ...base, streaming: false }])
    renderHook(() => usePower('k', 'c'))
    await tick(0)
    const before = vi.mocked(api.fetchPower).mock.calls.length
    await tick(3000)
    expect(vi.mocked(api.fetchPower).mock.calls.length).toBeGreaterThan(before)
  })
  it('extinction en cours (coupé mais encore alimenté)', async () => {
    vi.mocked(api.fetchPower).mockResolvedValue([{ ...base, on: false, powered: true }])
    const { result } = renderHook(() => usePower('k', 'c'))
    await tick(0)
    expect(result.current.power?.on).toBe(false)
  })
  it('éteinte et tombée : rythme normal ; permet de remplacer l’état', async () => {
    vi.mocked(api.fetchPower).mockResolvedValue([{ ...base, on: false, powered: false }])
    const { result } = renderHook(() => usePower('k', 'c'))
    await tick(0)
    act(() => result.current.setPower(base))
    expect(result.current.power).toEqual(base)
  })
  it('ignore les réponses après démontage', async () => {
    let ok: (r: never) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchPower)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const { result, unmount } = renderHook(() => usePower('k', 'c'))
    await tick(10_000)
    unmount()
    await act(async () => {
      ok([base] as never)
      ko(new Error('x'))
      await flush()
    })
    expect(result.current.power).toBeNull()
  })
})
