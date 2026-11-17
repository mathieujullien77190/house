import { fireEvent, render, screen } from '@testing-library/react'
import MediaPanel from './MediaPanel'
import { CLOSE_LABEL, IMAGE_ALT, PAUSE_LABEL, PLAY_LABEL, SEEK_LABEL } from './constants'

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

  it('une caméra portrait tourne le média dans un cadre portrait', () => {
    const { container } = render(<MediaPanel kind="image" title="Image" src="/a.jpg" rotated onClose={() => undefined} />)
    expect(screen.getByRole('img', { name: IMAGE_ALT }).className).toContain('rotate-90')
    expect(container.querySelector('aside > div:last-child')?.className).toContain('aspect-[9/16]')
  })

  it('Fermer appelle onClose', () => {
    const onClose = vi.fn()
    render(<MediaPanel kind="image" title="Image" src="/a.jpg" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: CLOSE_LABEL }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('une vidéo tournée n’a pas les commandes natives mais les siennes, droites, sous le cadre', () => {
    const { container } = render(<MediaPanel kind="video" title="Clip" src="/c.mp4" rotated onClose={() => undefined} />)
    const video = container.querySelector('video')!
    expect(video.controls).toBe(false)
    const play = vi.spyOn(video, 'play').mockResolvedValue(undefined)
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)
    fireEvent.pause(video)
    fireEvent.click(screen.getByRole('button', { name: PLAY_LABEL }))
    expect(play).toHaveBeenCalled()
    fireEvent.play(video)
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    fireEvent.click(screen.getByRole('button', { name: PAUSE_LABEL }))
    expect(pause).toHaveBeenCalled()
    Object.defineProperty(video, 'duration', { value: 20, configurable: true })
    fireEvent.durationChange(video)
    fireEvent.timeUpdate(video)
    fireEvent.change(screen.getByLabelText(SEEK_LABEL), { target: { value: '5' } })
    expect(video.currentTime).toBe(5)
    fireEvent.click(video)
    expect(pause).toHaveBeenCalledTimes(2)
  })

  it('la barre d’une vidéo tournée supporte une durée inconnue', () => {
    const { container } = render(<MediaPanel kind="video" title="Clip" src="/c.mp4" rotated onClose={() => undefined} />)
    Object.defineProperty(container.querySelector('video')!, 'duration', { value: Number.NaN, configurable: true })
    fireEvent.durationChange(container.querySelector('video')!)
    expect(screen.getByLabelText(SEEK_LABEL)).toHaveAttribute('max', '0')
  })
  it('un clic sur la vidéo tournée en pause ignore un refus de lecture', async () => {
    const { container } = render(<MediaPanel kind="video" title="Clip" src="/c.mp4" rotated onClose={() => undefined} />)
    const video = container.querySelector('video')!
    const play = vi.spyOn(video, 'play').mockRejectedValue(new Error('refus'))
    fireEvent.click(video)
    await Promise.resolve()
    await Promise.resolve()
    expect(play).toHaveBeenCalled()
  })
})
