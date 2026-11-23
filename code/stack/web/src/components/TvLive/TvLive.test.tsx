import { fireEvent, render, screen } from '@testing-library/react'
import type { Camera } from '@/types'
import TvLive from './TvLive'
import TvLiveUI from './UI'

type BackWindow = Window & { houseTvBack?: () => boolean }

const camera = (orientation: Camera['orientation']): Camera => ({ name: 'voliere-interieur', orientation })

describe('TvLive', () => {
  it('le direct en grand, seul ; une caméra de côté est tournée', () => {
    const { container, rerender } = render(<TvLive camera={camera('landscape')} onClose={() => undefined} />)
    expect(screen.getByRole('img', { name: 'voliere-interieur' })).toBeInTheDocument()
    expect(container.querySelector('img')?.getAttribute('src')).toContain('voliere-interieur')
    expect(container.querySelector('.rotate-90')).toBeNull()
    rerender(<TvLive camera={camera('portrait')} onClose={() => undefined} />)
    expect(container.querySelector('.rotate-90')).not.toBeNull()
  })

  it('Retour de la télé et Échap ferment ; les autres touches non ; la carte est suspendue pendant ce temps', () => {
    const onClose = vi.fn()
    const target = window as BackWindow
    const previous = vi.fn(() => false)
    target.houseTvBack = previous
    const { unmount } = render(<TvLive camera={camera('landscape')} onClose={onClose} />)
    expect(document.body.dataset.tvOverlay).toBe('1')
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(onClose).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(window, { key: 'a' })
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(target.houseTvBack?.()).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(3)
    unmount()
    expect(document.body.dataset.tvOverlay).toBeUndefined()
    expect(target.houseTvBack).toBe(previous)
    delete target.houseTvBack
  })
})

describe('TvLiveUI', () => {
  it('droit ou tourné', () => {
    const { container, rerender } = render(<TvLiveUI src="/a" turned={false} name="a" />)
    expect(container.querySelector('.rotate-90')).toBeNull()
    rerender(<TvLiveUI src="/a" turned name="a" />)
    expect(container.querySelector('.rotate-90')).not.toBeNull()
  })
})
