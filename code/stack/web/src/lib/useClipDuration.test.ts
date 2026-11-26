import { act, renderHook } from '@testing-library/react'
import { clipDurationOf } from './clipDurations'
import { useClipDuration } from './useClipDuration'

const videos: HTMLVideoElement[] = []

beforeEach(() => {
  videos.length = 0
  const create = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
    const element = create(tag, options)
    if (tag === 'video') {
      videos.push(element as HTMLVideoElement)
      Object.defineProperty(element, 'load', { value: vi.fn() })
    }
    return element
  })
})

const loaded = (video: HTMLVideoElement, duration: number) => {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true })
  act(() => video.onloadedmetadata?.(new Event('loadedmetadata')))
}

describe('useClipDuration', () => {
  it('rend null sans clip', () => {
    const { result } = renderHook(() => useClipDuration('e', null))
    expect(result.current).toBeNull()
    expect(videos).toHaveLength(0)
  })
  it('lit la durée dans les métadonnées et la retient', () => {
    const { result, unmount } = renderHook(() => useClipDuration('clip-1', '/clips/1'))
    loaded(videos[0], 12.5)
    expect(result.current).toBe(12.5)
    expect(clipDurationOf('clip-1')).toBe(12.5)
    // La vidéo est lâchée dès la durée lue : sa connexion vers l'API est rendue.
    expect(videos[0].onloadedmetadata).toBeNull()
    expect(videos[0].hasAttribute('src')).toBe(false)
    expect(videos[0].load).toHaveBeenCalled()
    unmount()
  })
  it('lâche la vidéo au démontage, même sans durée lue', () => {
    const { unmount } = renderHook(() => useClipDuration('clip-gone', '/clips/gone'))
    expect(videos[0].getAttribute('src')).toBe('/clips/gone')
    unmount()
    expect(videos[0].onloadedmetadata).toBeNull()
    expect(videos[0].hasAttribute('src')).toBe(false)
    expect(videos[0].load).toHaveBeenCalledTimes(1)
  })
  it('sans identifiant, la durée n’est pas retenue', () => {
    const { result } = renderHook(() => useClipDuration(null, '/clips/2'))
    loaded(videos[0], 3)
    expect(result.current).toBe(3)
  })
  it('ignore une durée infinie (flux)', () => {
    const { result } = renderHook(() => useClipDuration('x', '/clips/3'))
    loaded(videos[0], Infinity)
    expect(result.current).toBeNull()
  })
  it('sans identifiant, oublie la durée quand le clip change', () => {
    const { result, rerender } = renderHook(({ path }) => useClipDuration(null, path), { initialProps: { path: '/a' } })
    loaded(videos[0], 4)
    rerender({ path: '/b' })
    expect(result.current).toBeNull()
    expect(videos).toHaveLength(2)
  })
  it('une durée connue est gardée par identifiant et n’est pas redemandée', () => {
    const { result, rerender, unmount } = renderHook(({ path }) => useClipDuration('y', path), { initialProps: { path: '/a' } })
    loaded(videos[0], 4)
    rerender({ path: '/b' })
    expect(result.current).toBe(4)
    unmount()
    const again = renderHook(() => useClipDuration('y', '/a'))
    expect(again.result.current).toBe(4)
    expect(videos).toHaveLength(1)
  })
})
