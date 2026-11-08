import { fireEvent, render, screen } from '@testing-library/react'
import MediaPanel from './MediaPanel'
import { CLOSE_LABEL, IMAGE_ALT } from './constants'

describe('MediaPanel', () => {
  it('une vidéo démarre seule, en sourdine, avec ses commandes', () => {
    const { container } = render(<MediaPanel kind="video" title="Clip 1" src="/clip.mp4" onClose={() => undefined} />)
    expect(screen.getByText('Clip 1')).toBeInTheDocument()
    const video = container.querySelector('video')
    expect(video).toHaveAttribute('src', '/clip.mp4')
    expect(video?.autoplay).toBe(true)
    expect(video?.muted).toBe(true)
    expect(video?.controls).toBe(true)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('une image est montrée avec son texte alternatif', () => {
    const { container } = render(<MediaPanel kind="image" title="Image" src="/a.jpg" onClose={() => undefined} />)
    expect(screen.getByRole('img', { name: IMAGE_ALT })).toHaveAttribute('src', '/a.jpg')
    expect(container.querySelector('video')).toBeNull()
  })

  it('Fermer appelle onClose', () => {
    const onClose = vi.fn()
    render(<MediaPanel kind="image" title="Image" src="/a.jpg" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: CLOSE_LABEL }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
