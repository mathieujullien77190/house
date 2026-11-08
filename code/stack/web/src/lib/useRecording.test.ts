import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { useRecording } from './useRecording'

vi.mock('./api', () => ({ fetchRecording: vi.fn(), startRecording: vi.fn(), stopRecording: vi.fn() }))
const api = await import('./api')
const idle = { recording: false, id: null, started_at: null }

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

describe('useRecording', () => {
  it('désactivé : ne lit rien', async () => {
    const { result } = renderHook(() => useRecording('k', 'c', false))
    await settle(10_000)
    expect(api.fetchRecording).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({ recording: false, seconds: 0 })
  })

  it('retrouve un enregistrement en cours et compte les secondes', async () => {
    vi.mocked(api.fetchRecording).mockResolvedValue({ recording: true, id: 'x', started_at: 1_000_000 - 5 })
    const { result } = renderHook(() => useRecording('k', 'c', true))
    await settle()
    expect(result.current.recording).toBe(true)
    await settle(1000)
    expect(result.current.seconds).toBe(6)
  })

  it('état de départ illisible ou sans enregistrement : rien', async () => {
    vi.mocked(api.fetchRecording).mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useRecording('k', 'c', true))
    await settle()
    expect(result.current.recording).toBe(false)
  })

  it('ignore la lecture de départ après démontage', async () => {
    let ok: (s: { recording: boolean; id: string; started_at: number }) => void = () => undefined
    vi.mocked(api.fetchRecording).mockReturnValue(new Promise((resolve) => (ok = resolve)))
    const { result, unmount } = renderHook(() => useRecording('k', 'c', true))
    unmount()
    await act(async () => {
      ok({ recording: true, id: 'x', started_at: 1 })
      await flush()
    })
    expect(result.current.recording).toBe(false)
  })

  it('l’arrêt automatique est vu à la relecture, le message disparaît après 10 s', async () => {
    vi.mocked(api.fetchRecording).mockResolvedValueOnce({ recording: true, id: 'x', started_at: 1_000_000 })
    const { result } = renderHook(() => useRecording('k', 'c', true))
    await settle()
    vi.mocked(api.fetchRecording).mockResolvedValue(idle)
    await settle(5000)
    expect(result.current.recording).toBe(false)
    expect(result.current.stopped).toBe(true)
    await settle(10_000)
    expect(result.current.stopped).toBe(false)
  })

  it('une relecture qui échoue (réseau) ne dit pas que le clip se copie : l’enregistrement continue', async () => {
    vi.mocked(api.fetchRecording).mockResolvedValueOnce({ recording: true, id: 'x', started_at: 1_000_000 })
    const { result } = renderHook(() => useRecording('k', 'c', true))
    await settle()
    vi.mocked(api.fetchRecording).mockRejectedValue(new Error('x'))
    await settle(5000)
    expect(result.current.stopped).toBe(false)
    expect(result.current.recording).toBe(true)
    // Le réseau revient : l'enregistreur dit qu'il s'est arrêté, là le message apparaît.
    vi.mocked(api.fetchRecording).mockResolvedValue(idle)
    await settle(5000)
    expect(result.current).toMatchObject({ recording: false, stopped: true })
  })

  it('toggle démarre puis arrête', async () => {
    vi.mocked(api.fetchRecording).mockResolvedValue(idle)
    vi.mocked(api.startRecording).mockResolvedValue(undefined)
    vi.mocked(api.stopRecording).mockResolvedValue(undefined)
    const { result } = renderHook(() => useRecording('k', 'c', true))
    await settle()
    vi.mocked(api.fetchRecording).mockResolvedValue({ recording: true, id: 'x', started_at: 1_000_000 })
    await act(() => result.current.toggle())
    expect(api.startRecording).toHaveBeenCalledWith('k', 'c')
    expect(result.current.recording).toBe(true)
    await act(() => result.current.toggle())
    expect(api.stopRecording).toHaveBeenCalledWith('k', 'c')
    expect(result.current).toMatchObject({ recording: false, stopped: true, busy: false })
  })

  it('toggle signale un échec', async () => {
    vi.mocked(api.fetchRecording).mockResolvedValue(idle)
    vi.mocked(api.startRecording).mockRejectedValue(new Error('x'))
    const { result } = renderHook(() => useRecording('k', 'c', true))
    await settle()
    await act(() => result.current.toggle())
    expect(result.current.failed).toBe(true)
  })
})
