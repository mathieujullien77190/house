import { render, screen } from '@testing-library/react'
import PortraitClip from './PortraitClip'

describe('PortraitClip', () => {
  it('tourne la vidéo et pose ses commandes droites dans le cadre', () => {
    const { container } = render(<PortraitClip apiKey="k" path="/clips/1" audioSrc="/clips/1/audio" onClose={vi.fn()} />)
    const frame = container.querySelector('[data-rotated-frame]') as HTMLElement
    expect(frame).not.toBeNull()
    expect(frame.querySelector('video')).toHaveAttribute('src', '/clips/1')
    // les commandes sont dans le cadre mais hors de la zone tournée
    expect(screen.getByRole('slider', { name: /Position/ })).toBeInTheDocument()
  })
})
