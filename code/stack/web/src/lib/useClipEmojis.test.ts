import { act, renderHook } from '@testing-library/react'
import type { EventRow } from '@/types'
import * as api from '@/lib/api'
import { emojiItemId, useClipEmojis } from './useClipEmojis'

vi.mock('@/lib/api', () => ({ fetchSavedEvents: vi.fn() }))

const event = (id: string, emoji: string): EventRow => ({ id, camera: 'cam', emoji }) as EventRow
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('useClipEmojis', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('garde les clips qui ont un emoji, à leur place du plan ou sur la rangée de départ', async () => {
    vi.mocked(api.fetchSavedEvents).mockResolvedValue([event('a', '🦊'), event('b', ''), event('c', '🐦')])
    const { result } = renderHook(() => useClipEmojis('k', { [emojiItemId('c')]: { x: 5, y: 6 } }, true))
    expect(result.current.emojis).toEqual([])
    await act(flush)
    expect(result.current.emojis.map((item) => [item.id, item.emoji])).toEqual([
      ['a', '🦊'],
      ['c', '🐦'],
    ])
    expect(result.current.emojis[1]).toMatchObject({ x: 5, y: 6 })
    expect(Number.isFinite(result.current.emojis[0].x)).toBe(true)
    expect(Object.keys(result.current.clips)).toEqual(['a', 'c'])
  })

  it('relit toutes les 30 s ; un échec garde la liste ; désactivé, ne lit rien', async () => {
    vi.mocked(api.fetchSavedEvents)
      .mockResolvedValueOnce([event('a', '🦊')])
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValue([])
    const { result, unmount } = renderHook(() => useClipEmojis('k', {}, true))
    await act(flush)
    expect(result.current.emojis).toHaveLength(1)
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await flush()
    })
    expect(result.current.emojis).toHaveLength(1)
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await flush()
    })
    expect(result.current.emojis).toHaveLength(0)
    unmount()
    vi.mocked(api.fetchSavedEvents).mockClear()
    renderHook(() => useClipEmojis('k', {}, false))
    await act(flush)
    expect(api.fetchSavedEvents).not.toHaveBeenCalled()
  })

  it('une réponse qui arrive après le démontage est ignorée', async () => {
    let resolve: (list: EventRow[]) => void = () => undefined
    vi.mocked(api.fetchSavedEvents).mockReturnValue(new Promise<EventRow[]>((done) => (resolve = done)))
    const { result, unmount } = renderHook(() => useClipEmojis('k', {}, true))
    unmount()
    await act(async () => resolve([event('a', '🦊')]))
    expect(result.current.emojis).toEqual([])
  })
})
