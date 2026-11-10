import { act, renderHook } from '@testing-library/react'
import type { ShutterInfo, ShuttersState } from '@/types'
import * as api from '@/lib/api'
import { failureOf, useShutters } from './useShutters'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchShutters: vi.fn(),
  sendShutter: vi.fn(),
  closeShutterHalf: vi.fn(),
  setShutterAuto: vi.fn(),
}))

const shutter = (patch: Partial<ShutterInfo> = {}): ShutterInfo =>
  ({ id: '1', name: 'Cuisine', lastCommand: null, lastAt: null, auto: { open: false, close: true }, ...patch }) as ShutterInfo
const state = (shutters: ShutterInfo[] = [shutter()]): ShuttersState => ({ mock: false, shutters })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => vi.clearAllMocks())

describe('failureOf', () => {
  it('l’ordre, la case automatique, ou rien', () => {
    expect(failureOf('1', '1')).toBe('send')
    expect(failureOf('auto-1', '1')).toBe('auto')
    expect(failureOf('2', '1')).toBeNull()
    expect(failureOf(null, '1')).toBeNull()
  })
})

describe('useShutters', () => {
  it('lit les volets ; avant la réponse : loading, ensuite rien à signaler', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state())
    const { result } = renderHook(() => useShutters('k'))
    expect(result.current.state).toBeNull()
    expect(result.current.problem).toBe('loading')
    await act(flush)
    expect(result.current.state?.shutters).toHaveLength(1)
    expect(result.current.problem).toBeNull()
  })

  it('un 503 dit « aucun volet configuré », une autre erreur « ne répondent pas » ; le dernier état lu est gardé', async () => {
    vi.mocked(api.fetchShutters).mockRejectedValueOnce(new api.ApiError(503, 'x'))
    const { result, unmount } = renderHook(() => useShutters('k'))
    await act(flush)
    expect(result.current.problem).toBe('none')
    unmount()
    vi.mocked(api.fetchShutters).mockResolvedValueOnce(state()).mockRejectedValueOnce(new Error('x'))
    vi.useFakeTimers()
    const second = renderHook(() => useShutters('k'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(second.result.current.problem).toBe('off')
    expect(second.result.current.state?.shutters).toHaveLength(1)
    vi.useRealTimers()
  })

  it('une réponse ou une erreur qui arrive après le démontage est ignorée', async () => {
    let answer: (value: ShuttersState) => void = () => undefined
    vi.mocked(api.fetchShutters).mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result, unmount } = renderHook(() => useShutters('k'))
    unmount()
    answer(state())
    await act(flush)
    expect(result.current.state).toBeNull()
    let fail: (error: Error) => void = () => undefined
    vi.mocked(api.fetchShutters).mockReturnValue(new Promise((_resolve, reject) => (fail = reject)))
    const other = renderHook(() => useShutters('k'))
    other.unmount()
    fail(new Error('x'))
    await act(flush)
    expect(other.result.current.problem).toBe('loading')
  })

  it('un ordre : le volet est occupé, la réponse de l’API le remplace ; un échec le dit ; « Fermer à moitié » aussi', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter(), shutter({ id: '2', name: 'Autre' })]))
    vi.mocked(api.sendShutter)
      .mockResolvedValueOnce(shutter({ lastCommand: 'up', lastAt: 1_700_000_000 }))
      .mockRejectedValueOnce(new Error('x'))
    vi.mocked(api.closeShutterHalf).mockResolvedValueOnce(shutter({ halfRunning: true }))
    const { result } = renderHook(() => useShutters('k'))
    await act(flush)
    act(() => result.current.send('1', 'up'))
    expect(result.current.busy).toBe('1')
    await act(flush)
    expect(result.current.busy).toBeNull()
    expect(result.current.state?.shutters[0].lastCommand).toBe('up')
    expect(result.current.state?.shutters[1].lastCommand).toBeNull()
    act(() => result.current.send('1', 'stop'))
    await act(flush)
    expect(result.current.failed).toBe('1')
    act(() => result.current.half('1'))
    await act(flush)
    expect(result.current.failed).toBeNull()
    expect(api.closeShutterHalf).toHaveBeenCalledWith('k', '1')
  })

  it('un ordre donné avant la première lecture : la réponse n’a pas d’état où se poser', async () => {
    vi.mocked(api.fetchShutters).mockReturnValue(new Promise(() => undefined))
    vi.mocked(api.sendShutter).mockResolvedValue(shutter())
    const { result } = renderHook(() => useShutters('k'))
    act(() => result.current.send('1', 'up'))
    await act(flush)
    expect(result.current.state).toBeNull()
  })

  it('les cases automatiques changent tout de suite et reviennent en arrière si l’API refuse ; un volet sans action automatique ne change pas', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter(), shutter({ id: '2', auto: null })]))
    vi.mocked(api.setShutterAuto).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('x'))
    const { result } = renderHook(() => useShutters('k'))
    await act(flush)
    act(() => result.current.changeAuto('1', 'open', true))
    expect(result.current.state?.shutters[0].auto?.open).toBe(true)
    await act(flush)
    expect(api.setShutterAuto).toHaveBeenCalledWith('k', '1', { open: true })
    act(() => result.current.changeAuto('1', 'close', false))
    await act(flush)
    expect(result.current.state?.shutters[0].auto?.close).toBe(true)
    expect(result.current.failed).toBe('auto-1')
    vi.mocked(api.setShutterAuto).mockResolvedValue(undefined)
    act(() => result.current.changeAuto('2', 'open', true))
    expect(result.current.state?.shutters[1].auto).toBeNull()
  })

  it('une case changée avant la première lecture ne casse rien', async () => {
    vi.mocked(api.fetchShutters).mockReturnValue(new Promise(() => undefined))
    vi.mocked(api.setShutterAuto).mockResolvedValue(undefined)
    const { result } = renderHook(() => useShutters('k'))
    act(() => result.current.changeAuto('1', 'open', true))
    await act(flush)
    expect(result.current.state).toBeNull()
  })

  it('pendant un « Fermer à moitié », la lecture se fait toutes les 2 s', async () => {
    vi.useFakeTimers()
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter({ halfRunning: true })]))
    renderHook(() => useShutters('k'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    vi.mocked(api.fetchShutters).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(api.fetchShutters).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
