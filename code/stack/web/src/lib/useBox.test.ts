import { act, renderHook } from '@testing-library/react'
import { POLL_MS } from '@/components/BoxPanel/constants'
import type { BoxState } from '@/types'
import * as api from '@/lib/api'
import { useBox } from './useBox'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchBox: vi.fn(),
  setBoxWifi: vi.fn(),
}))

const state = (over: Partial<BoxState> = {}): BoxState => ({
  configured: true,
  reachable: true,
  model: 'Freebox',
  firmware: null,
  uptime: null,
  connection: null,
  wifi: { enabled: true },
  devices: [],
  ...over,
})
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => vi.clearAllMocks())

describe('useBox', () => {
  it('lit la box, garde la dernière lecture quand une relecture échoue, et le dit', async () => {
    vi.useFakeTimers()
    vi.mocked(api.fetchBox).mockResolvedValueOnce(state()).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(state({ model: 'Pop' }))
    const { result, unmount } = renderHook(() => useBox('k'))
    expect(result.current.problem).toBe('loading')
    expect(result.current.box).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.problem).toBeNull()
    expect(result.current.box?.model).toBe('Freebox')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })
    expect(result.current.problem).toBe('off')
    expect(result.current.box?.model).toBe('Freebox')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })
    expect(result.current.problem).toBeNull()
    expect(result.current.box?.model).toBe('Pop')
    unmount()
    vi.useRealTimers()
  })

  it('une lecture qui répond après le démontage est ignorée', async () => {
    let answer: (value: BoxState) => void = () => undefined
    let fail: (reason: Error) => void = () => undefined
    vi.mocked(api.fetchBox)
      .mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
      .mockReturnValueOnce(new Promise((_resolve, reject) => (fail = reject)))
    const first = renderHook(() => useBox('k'))
    first.unmount()
    answer(state())
    const second = renderHook(() => useBox('k'))
    second.unmount()
    fail(new Error('x'))
    await act(flush)
    expect(first.result.current.box).toBeNull()
    expect(second.result.current.problem).toBe('loading')
  })

  it('setWifi envoie l’ordre, remplace l’état du WiFi, et dit un échec', async () => {
    vi.mocked(api.fetchBox).mockResolvedValue(state())
    vi.mocked(api.setBoxWifi).mockResolvedValueOnce({ enabled: false }).mockRejectedValueOnce(new Error('x'))
    const { result } = renderHook(() => useBox('k'))
    await act(flush)
    act(() => result.current.setWifi(false))
    expect(result.current.busy).toBe(true)
    await act(flush)
    expect(result.current.busy).toBe(false)
    expect(api.setBoxWifi).toHaveBeenCalledWith('k', false)
    expect(result.current.box?.wifi).toEqual({ enabled: false })
    expect(result.current.failed).toBe(false)
    act(() => result.current.setWifi(true))
    await act(flush)
    expect(result.current.failed).toBe(true)
    expect(result.current.box?.wifi).toEqual({ enabled: false })
  })

  it('setWifi avant la première lecture ne crée pas d’état', async () => {
    vi.mocked(api.fetchBox).mockReturnValue(new Promise(() => undefined))
    vi.mocked(api.setBoxWifi).mockResolvedValue({ enabled: true })
    const { result } = renderHook(() => useBox('k'))
    act(() => result.current.setWifi(true))
    await act(flush)
    expect(result.current.box).toBeNull()
  })
})
