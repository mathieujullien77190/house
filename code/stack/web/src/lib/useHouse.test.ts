import { act, renderHook } from '@testing-library/react'
import { flush } from '@/test/fetch'
import { ApiError } from './api'
import { EVENTS_REFRESH_MS, useHouse } from './useHouse'

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  checkKey: vi.fn(),
  clearStoredKey: vi.fn(),
  fetchEvents: vi.fn(),
  fetchLive: vi.fn(),
}))
const api = await import('./api')
const checkKey = vi.mocked(api.checkKey)
const fetchEvents = vi.mocked(api.fetchEvents)
const fetchLive = vi.mocked(api.fetchLive)

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('{}'))),
  )
  checkKey.mockResolvedValue(new Response('{}'))
  fetchLive.mockResolvedValue([
    { camera: 'a', url: '', orientation: 'portrait' },
    { camera: 'b', url: '', orientation: 'landscape', rain: 'heavy' },
    { camera: 'c', url: '', orientation: 'landscape', rain: 'rain' },
  ])
  fetchEvents.mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

describe('useHouse', () => {
  it('essaie le cookie au départ puis passe à prêt avec les caméras', async () => {
    const { result } = renderHook(() => useHouse())
    expect(result.current.status).toBe('checking')
    await act(flush)
    expect(result.current.status).toBe('ready')
    expect(result.current.cameras).toEqual([
      { name: 'a', orientation: 'portrait', rain: 'off' },
      { name: 'b', orientation: 'landscape', rain: 'heavy' },
      { name: 'c', orientation: 'landscape', rain: 'rain' },
    ])
    expect(api.clearStoredKey).toHaveBeenCalled()
  })

  it('sans clé, un refus ne dit rien et la page se verrouille', async () => {
    checkKey.mockRejectedValue(new ApiError(401, 'clé refusée'))
    const { result } = renderHook(() => useHouse())
    await act(flush)
    expect(result.current.status).toBe('locked')
    expect(result.current.message).toBe('')
  })

  it('une panne sans clé saisie affiche le message', async () => {
    checkKey.mockRejectedValue(new Error('réseau'))
    const { result } = renderHook(() => useHouse())
    await act(flush)
    expect(result.current.message).toBe('réseau')
    expect(result.current.status).toBe('locked')
  })

  it('une chaîne lancée est lue telle quelle', async () => {
    checkKey.mockRejectedValue('texte')
    const { result } = renderHook(() => useHouse())
    await act(flush)
    expect(result.current.message).toBe('texte')
  })

  it('une clé saisie refusée est oubliée et le dit', async () => {
    checkKey.mockRejectedValueOnce(new ApiError(401, 'clé refusée'))
    const { result } = renderHook(() => useHouse())
    await act(flush)
    checkKey.mockRejectedValueOnce(new ApiError(401, 'clé refusée'))
    act(() => result.current.connect('mauvaise'))
    expect(result.current.key).toBe('mauvaise')
    await act(flush)
    expect(result.current.message).toBe('clé refusée')
    expect(result.current.key).toBe('')
  })

  it('annule la vérification au démontage', async () => {
    const { result, unmount } = renderHook(() => useHouse())
    unmount()
    await act(flush)
    expect(result.current.status).toBe('checking')
  })

  it('annule aussi une erreur arrivée après le démontage', async () => {
    checkKey.mockRejectedValue(new Error('tard'))
    const { result, unmount } = renderHook(() => useHouse())
    unmount()
    await act(flush)
    expect(result.current.message).toBe('')
  })

  it('relit les événements à intervalle, un seul appel à la fois', async () => {
    const { result } = renderHook(() => useHouse())
    await act(flush)
    fetchEvents.mockClear()
    let release: (rows: []) => void = () => undefined
    fetchEvents.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    await act(async () => {
      vi.advanceTimersByTime(EVENTS_REFRESH_MS * 3)
    })
    expect(fetchEvents).toHaveBeenCalledTimes(1)
    await act(async () => {
      release([])
      await flush()
    })
    expect(result.current.message).toBe('')
    await act(async () => {
      vi.advanceTimersByTime(EVENTS_REFRESH_MS)
    })
    expect(fetchEvents).toHaveBeenCalledTimes(2)
  })

  it('une erreur de relecture est affichée, une clé refusée déconnecte', async () => {
    const { result } = renderHook(() => useHouse())
    await act(flush)
    fetchEvents.mockRejectedValueOnce(new Error('coupé'))
    await act(async () => {
      vi.advanceTimersByTime(EVENTS_REFRESH_MS)
    })
    expect(result.current.message).toBe('coupé')
    expect(result.current.status).toBe('ready')
    fetchEvents.mockRejectedValueOnce(new ApiError(401, 'clé refusée'))
    await act(async () => {
      vi.advanceTimersByTime(EVENTS_REFRESH_MS)
    })
    expect(result.current.status).toBe('locked')
    expect(result.current.message).toBe('clé refusée')
    expect(result.current).toMatchObject({ cameras: [], events: [], key: '' })
    expect(fetch).toHaveBeenCalledWith('/logout')
  })

  it('« oublier » ferme la session même si /logout échoue', async () => {
    const { result } = renderHook(() => useHouse())
    await act(flush)
    vi.mocked(fetch).mockRejectedValueOnce(new Error('x'))
    act(() => result.current.forget())
    await act(flush)
    expect(result.current).toMatchObject({ status: 'locked', cameras: [], events: [], key: '' })
  })

  it('ignore une relecture qui aboutit après le démontage', async () => {
    const { unmount } = renderHook(() => useHouse())
    await act(flush)
    let release: (rows: []) => void = () => undefined
    fetchEvents.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    await act(async () => {
      vi.advanceTimersByTime(EVENTS_REFRESH_MS)
    })
    unmount()
    await act(async () => {
      release([])
      await flush()
    })
  })

  it('ignore une erreur de relecture arrivée après le démontage', async () => {
    const { result, unmount } = renderHook(() => useHouse())
    await act(flush)
    let fail: (e: Error) => void = () => undefined
    fetchEvents.mockReturnValueOnce(new Promise((_r, reject) => (fail = reject)))
    await act(async () => {
      vi.advanceTimersByTime(EVENTS_REFRESH_MS)
    })
    unmount()
    await act(async () => {
      fail(new Error('tard'))
      await flush()
    })
    expect(result.current.message).toBe('')
  })
})
