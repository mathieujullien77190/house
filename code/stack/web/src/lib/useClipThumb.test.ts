import { act, renderHook } from '@testing-library/react'
import { collectVideos, fakeContext2d, stubCanvasContext, stubCanvasImage } from '@/test/canvas'
import { useClipThumb } from './useClipThumb'

const IMAGE = 'data:image/jpeg;base64,xx'
let videos: HTMLVideoElement[] = []

beforeEach(() => {
  videos = collectVideos()
  stubCanvasImage(IMAGE)
})

afterEach(() => {
  vi.useRealTimers()
})

const size = (video: HTMLVideoElement, width: number, height: number) => {
  Object.defineProperty(video, 'videoWidth', { value: width, configurable: true })
  Object.defineProperty(video, 'videoHeight', { value: height, configurable: true })
}

const metadata = (video: HTMLVideoElement, duration: number) => {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true })
  act(() => video.onloadedmetadata?.(new Event('loadedmetadata')))
}

const data = (video: HTMLVideoElement) => act(() => video.onloadeddata?.(new Event('loadeddata')))

describe('useClipThumb', () => {
  it('sans clip : rien, aucune vidéo', () => {
    const { result } = renderHook(() => useClipThumb(null))
    expect(result.current).toEqual({ image: null, seconds: null })
    expect(videos).toHaveLength(0)
  })

  it('copie la première image, lit la durée, puis lâche la vidéo', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    const { result } = renderHook(() => useClipThumb('/clips/one'))
    const [video] = videos
    expect(video.getAttribute('src')).toBe('/clips/one')
    expect(video.preload).toBe('auto')
    expect(video.muted).toBe(true)
    expect(result.current).toEqual({ image: null, seconds: null })
    size(video, 1920, 1080)
    metadata(video, 12.5)
    data(video)
    expect(result.current).toEqual({ image: IMAGE, seconds: 12.5 })
    // L'image est réduite à 480 px de large, à ses proportions.
    expect(context.drawImage).toHaveBeenCalledWith(video, 0, 0, 480, 270)
    expect(video.hasAttribute('src')).toBe(false)
    expect(video.onloadeddata).toBeNull()
    expect(video.onerror).toBeNull()
    expect(video.load).toHaveBeenCalled()
  })

  it('une vignette déjà faite ne recharge rien', () => {
    stubCanvasContext(fakeContext2d())
    const first = renderHook(() => useClipThumb('/clips/cached'))
    size(videos[0], 320, 180)
    data(videos[0])
    expect(first.result.current).toEqual({ image: IMAGE, seconds: null })
    first.unmount()
    const again = renderHook(() => useClipThumb('/clips/cached'))
    expect(again.result.current).toEqual({ image: IMAGE, seconds: null })
    expect(videos).toHaveLength(1)
  })

  it('une petite vidéo garde sa largeur ; une durée infinie est ignorée', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    const { result } = renderHook(() => useClipThumb('/clips/small'))
    size(videos[0], 320, 180)
    metadata(videos[0], Infinity)
    data(videos[0])
    expect(context.drawImage).toHaveBeenCalledWith(videos[0], 0, 0, 320, 180)
    expect(result.current).toEqual({ image: IMAGE, seconds: null })
  })

  it('sans image dessinable : la durée seule, et rien n’est gardé', () => {
    stubCanvasContext(null)
    const noSize = renderHook(() => useClipThumb('/clips/no-size'))
    metadata(videos[0], 8)
    data(videos[0])
    expect(noSize.result.current).toEqual({ image: null, seconds: 8 })
    const noContext = renderHook(() => useClipThumb('/clips/no-context'))
    size(videos[1], 640, 360)
    data(videos[1])
    expect(noContext.result.current).toEqual({ image: null, seconds: null })
    // Pas gardée : un nouveau montage la redemande.
    noSize.unmount()
    renderHook(() => useClipThumb('/clips/no-size')).unmount()
    expect(videos).toHaveLength(3)
    noContext.unmount()
  })

  it('une vidéo illisible, ou trop lente, est lâchée sans image', () => {
    vi.useFakeTimers()
    const broken = renderHook(() => useClipThumb('/clips/broken'))
    act(() => videos[0].onerror?.(new Event('error')))
    expect(broken.result.current).toEqual({ image: null, seconds: null })
    expect(videos[0].hasAttribute('src')).toBe(false)
    const slow = renderHook(() => useClipThumb('/clips/slow'))
    expect(videos[1].getAttribute('src')).toBe('/clips/slow')
    act(() => vi.advanceTimersByTime(15000))
    expect(videos[1].hasAttribute('src')).toBe(false)
    expect(slow.result.current).toEqual({ image: null, seconds: null })
  })

  it('changer de clip oublie la vignette sans image du précédent', () => {
    const { result, rerender } = renderHook(({ path }) => useClipThumb(path), { initialProps: { path: '/clips/before' } })
    metadata(videos[0], 5)
    act(() => videos[0].onerror?.(new Event('error')))
    expect(result.current).toEqual({ image: null, seconds: 5 })
    rerender({ path: '/clips/after' })
    expect(result.current).toEqual({ image: null, seconds: null })
    expect(videos).toHaveLength(2)
  })

  it('deux vidéos à la fois : les suivantes attendent leur tour', () => {
    stubCanvasContext(fakeContext2d())
    const a = renderHook(() => useClipThumb('/clips/queue-a'))
    const b = renderHook(() => useClipThumb('/clips/queue-b'))
    const c = renderHook(() => useClipThumb('/clips/queue-c'))
    const d = renderHook(() => useClipThumb('/clips/queue-d'))
    expect(videos).toHaveLength(2)
    // c est démontée avant son tour : elle rend sa place sans créer de vidéo.
    c.unmount()
    size(videos[0], 320, 180)
    data(videos[0])
    expect(a.result.current.image).toBe(IMAGE)
    expect(videos).toHaveLength(3)
    expect(videos[2].getAttribute('src')).toBe('/clips/queue-d')
    // b est démontée en cours de lecture : sa vidéo est lâchée, rien n'est gardé.
    b.unmount()
    expect(videos[1].hasAttribute('src')).toBe(false)
    size(videos[2], 320, 180)
    data(videos[2])
    expect(d.result.current.image).toBe(IMAGE)
    // Démonter après la fin ne lâche pas la vidéo une seconde fois.
    const loads = vi.mocked(videos[2].load).mock.calls.length
    d.unmount()
    expect(vi.mocked(videos[2].load).mock.calls).toHaveLength(loads)
    // La file est vide : deux nouvelles vidéos partent aussitôt.
    const e = renderHook(() => useClipThumb('/clips/queue-e'))
    const f = renderHook(() => useClipThumb('/clips/queue-f'))
    expect(videos).toHaveLength(5)
    e.unmount()
    f.unmount()
    a.unmount()
  })
})
