import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { useFade } from './useFade'

vi.mock('./api', () => ({ fetchFade: vi.fn(), startFade: vi.fn(), cancelFade: vi.fn() }))
const api = await import('./api')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000_000)
})
afterEach(() => vi.useRealTimers())

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('useFade', () => {
  it('inactif ou sans lampe : ne lit rien et toggle ne fait rien', async () => {
    const { result } = renderHook(() => useFade('k', undefined, true))
    renderHook(() => useFade('k', 'l', false))
    await settle(20_000)
    expect(api.fetchFade).not.toHaveBeenCalled()
    await act(() => result.current.toggle())
    expect(api.startFade).not.toHaveBeenCalled()
  })

  it('lit l’état, compte le temps restant et le relit', async () => {
    vi.mocked(api.fetchFade).mockResolvedValue({ fading: true, ends_at: 1_000_000 + 60 })
    const { result, unmount } = renderHook(() => useFade('k', 'l', true))
    await settle()
    expect(result.current.fading).toBe(true)
    expect(result.current.remaining).toBe(60)
    await settle(10_000)
    expect(result.current.remaining).toBe(50)
    expect(vi.mocked(api.fetchFade).mock.calls.length).toBeGreaterThan(1)
    unmount()
  })

  it('remaining vaut null hors extinction ou sans heure de fin', async () => {
    vi.mocked(api.fetchFade).mockResolvedValue({ fading: true, ends_at: null })
    const { result } = renderHook(() => useFade('k', 'l', true))
    await settle()
    expect(result.current.remaining).toBeNull()
  })

  it('une lecture ratée est ignorée', async () => {
    vi.mocked(api.fetchFade).mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useFade('k', 'l', true))
    await settle()
    expect(result.current.fading).toBe(false)
  })

  it('ignore une lecture arrivée après le démontage', async () => {
    let ok: (s: never) => void = () => undefined
    vi.mocked(api.fetchFade).mockReturnValue(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useFade('k', 'l', true))
    unmount()
    await act(async () => {
      ok({ fading: true, ends_at: 1 } as never)
      await flush()
    })
    expect(result.current.fading).toBe(false)
  })

  it('toggle lance puis annule l’extinction, et signale un échec', async () => {
    vi.mocked(api.fetchFade).mockResolvedValue({ fading: false, ends_at: null })
    vi.mocked(api.startFade).mockResolvedValue({ fading: true, ends_at: 1_000_000 + 900 })
    vi.mocked(api.cancelFade).mockResolvedValue({ fading: false, ends_at: null })
    const { result } = renderHook(() => useFade('k', 'l', true))
    await settle()
    await act(() => result.current.toggle())
    expect(api.startFade).toHaveBeenCalledWith('k', 'l')
    expect(result.current.fading).toBe(true)
    expect(result.current.busy).toBe(false)
    await act(() => result.current.toggle())
    expect(api.cancelFade).toHaveBeenCalledWith('k', 'l')
    expect(result.current.fading).toBe(false)
    vi.mocked(api.startFade).mockRejectedValue(new Error('x'))
    await act(() => result.current.toggle())
    expect(result.current.failed).toBe(true)
  })
})
