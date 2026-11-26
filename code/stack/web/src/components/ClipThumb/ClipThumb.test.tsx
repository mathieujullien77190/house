import { render } from '@testing-library/react'
import type { ClipThumb as Thumb } from '@/lib/useClipThumb'
import ClipThumb from './ClipThumb'

const h = vi.hoisted(() => ({ thumb: { image: null, seconds: null } as { image: string | null; seconds: number | null }, paths: [] as (string | null)[] }))

vi.mock('@/lib/useClipThumb', () => ({
  useClipThumb: (path: string | null): Thumb => {
    h.paths.push(path)
    return h.thumb
  },
}))

beforeEach(() => {
  h.thumb = { image: null, seconds: null }
  h.paths.length = 0
})

describe('ClipThumb', () => {
  it('tant que l’image n’est pas lue : un bloc vide, aucune durée', () => {
    const onDuration = vi.fn()
    const { container } = render(<ClipThumb path="/clips/a" className="thumb" onDuration={onDuration} />)
    expect(h.paths).toEqual(['/clips/a'])
    expect(container.querySelector('div.thumb')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('video')).toBeNull()
    expect(onDuration).not.toHaveBeenCalled()
  })

  it('l’image fixe et la durée une fois lues', () => {
    const onDuration = vi.fn()
    const view = render(<ClipThumb path="/clips/a" className="thumb" onDuration={onDuration} />)
    h.thumb = { image: 'data:image/jpeg;base64,xx', seconds: 14.4 }
    const later = vi.fn()
    view.rerender(<ClipThumb path="/clips/a" className="thumb" onDuration={later} />)
    const image = view.container.querySelector('img.thumb')
    expect(image).toHaveAttribute('src', 'data:image/jpeg;base64,xx')
    expect(image).toHaveAttribute('alt', '')
    // La durée va à la fonction du dernier rendu, une seule fois.
    expect(onDuration).not.toHaveBeenCalled()
    expect(later).toHaveBeenCalledExactlyOnceWith(14.4)
    view.rerender(<ClipThumb path="/clips/a" className="thumb" onDuration={later} />)
    expect(later).toHaveBeenCalledTimes(1)
  })

  it('sans onDuration, la durée lue est ignorée', () => {
    h.thumb = { image: null, seconds: 3 }
    const { container } = render(<ClipThumb path="/clips/a" className="thumb" />)
    expect(container.querySelector('div.thumb')).not.toBeNull()
  })
})
