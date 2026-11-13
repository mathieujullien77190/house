import { act, renderHook } from '@testing-library/react'
import type { BoxGuests } from '@/types'
import * as api from '@/lib/api'
import { useBoxGuests } from './useBoxGuests'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchBoxGuests: vi.fn(),
  setBoxExcluded: vi.fn(),
}))

const data = (): BoxGuests => ({ filterState: 'disabled', guests: [], events: [] })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => vi.clearAllMocks())

describe('useBoxGuests', () => {
  it('lit les invités, garde la dernière lecture quand une relecture échoue', async () => {
    vi.useFakeTimers()
    vi.mocked(api.fetchBoxGuests).mockResolvedValueOnce(data()).mockRejectedValueOnce(new Error('x'))
    const { result, unmount } = renderHook(() => useBoxGuests('k'))
    expect(result.current.guests).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.guests?.filterState).toBe('disabled')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(result.current.guests?.filterState).toBe('disabled')
    unmount()
    vi.useRealTimers()
  })

  it('ne lit rien quand il est désactivé', async () => {
    renderHook(() => useBoxGuests('k', false))
    await act(flush)
    expect(api.fetchBoxGuests).not.toHaveBeenCalled()
  })

  it('setExcluded écrit puis relit ; les erreurs ont leur texte', async () => {
    vi.mocked(api.fetchBoxGuests).mockResolvedValue(data())
    vi.mocked(api.setBoxExcluded)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new api.ApiError(409, 'x'))
      .mockRejectedValueOnce(new api.ApiError(502, 'x'))
    const { result } = renderHook(() => useBoxGuests('k'))
    await act(flush)
    act(() => result.current.setExcluded('AA', true))
    expect(result.current.busy).toBe('AA')
    await act(flush)
    expect(result.current.busy).toBeNull()
    expect(api.fetchBoxGuests).toHaveBeenCalledTimes(2)
    expect(api.setBoxExcluded).toHaveBeenCalledWith('k', 'AA', true)
    expect(result.current.error).toBeNull()
    act(() => result.current.setExcluded('AA', true))
    await act(flush)
    expect(result.current.error).toMatch(/liste blanche/)
    act(() => result.current.setExcluded('AA', true))
    await act(flush)
    expect(result.current.error).toMatch(/Modification des réglages/)
  })

  it('une lecture qui répond après le démontage est ignorée', async () => {
    let answer: (value: BoxGuests) => void = () => undefined
    vi.mocked(api.fetchBoxGuests).mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { result, unmount } = renderHook(() => useBoxGuests('k'))
    unmount()
    answer(data())
    await act(flush)
    expect(result.current.guests).toBeNull()
  })

  it('une erreur qui n’est pas une ApiError donne le texte général', async () => {
    vi.mocked(api.fetchBoxGuests).mockResolvedValue(data())
    vi.mocked(api.setBoxExcluded).mockRejectedValueOnce(new Error('réseau'))
    const { result } = renderHook(() => useBoxGuests('k'))
    await act(flush)
    act(() => result.current.setExcluded('AA', false))
    await act(flush)
    expect(result.current.error).toMatch(/Modification des réglages/)
  })
})
