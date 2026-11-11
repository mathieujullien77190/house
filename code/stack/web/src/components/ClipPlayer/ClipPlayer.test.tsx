import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush, reply, stubFetch } from '@/test/fetch'
import ClipPlayer from './ClipPlayer'
import { FAILURE_TEXT } from './constants'

const video = () => document.querySelector('video') as HTMLVideoElement

const failWith = (code: number | undefined) => {
  Object.defineProperty(video(), 'error', { value: code === undefined ? null : { code }, configurable: true })
  fireEvent.error(video())
}

describe('ClipPlayer', () => {
  it('lit le clip', () => {
    render(<ClipPlayer path="/clips/1" onClose={vi.fn()} />)
    expect(video()).toHaveAttribute('src', '/clips/1')
  })

  it.each([
    [2, FAILURE_TEXT[2]],
    [3, FAILURE_TEXT[3]],
    [4, FAILURE_TEXT[4]],
    [99, FAILURE_TEXT[0]],
    [undefined, FAILURE_TEXT[0]],
  ])('une erreur de code %s affiche son message et prévient le parent', (code, text) => {
    const onFailure = vi.fn()
    const onClose = vi.fn()
    render(<ClipPlayer path="/clips/1" onClose={onClose} onFailure={onFailure} />)
    failWith(code)
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(onFailure).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('sans rappels donnés, les événements de la vidéo ne cassent rien', () => {
    render(<ClipPlayer path="/clips/1" onClose={vi.fn()} />)
    fireEvent.loadedData(video())
    fireEvent.timeUpdate(video())
    failWith(3)
  })

  it('remonte durée, position et première image', () => {
    const onReady = vi.fn()
    const onTime = vi.fn()
    const onDuration = vi.fn()
    render(
      <ClipPlayer path="/clips/1" onClose={vi.fn()} onReady={onReady} onTime={onTime} onDuration={onDuration} startAt={3} restart={1} />,
    )
    fireEvent.loadedData(video())
    expect(onReady).toHaveBeenCalled()
    fireEvent.timeUpdate(video())
    expect(onTime).toHaveBeenCalled()
    Object.defineProperty(video(), 'readyState', { value: 4, configurable: true })
    fireEvent.loadedMetadata(video())
    expect(onDuration).toHaveBeenCalled()
  })
})

describe('ClipPlayer : contours du mouvement', () => {
  const FRAMES = { frames: [[1, [[[0.1, 0.1], [0.5, 0.1], [0.3, 0.5]]]]] }
  const seek = (time: number) => {
    Object.defineProperty(video(), 'currentTime', { value: time, configurable: true })
    fireEvent.timeUpdate(video())
  }

  it('charge les contours avec la clé et les dessine selon la position de lecture', async () => {
    const spy = stubFetch(() => reply(FRAMES))
    const onTime = vi.fn()
    const { container } = render(<ClipPlayer path="/clips/1" shapesSrc="/clips/1/shapes" apiKey="k" onClose={vi.fn()} onTime={onTime} />)
    await act(flush)
    expect(spy.mock.calls[0][0]).toBe('/clips/1/shapes')
    seek(1.2)
    expect(onTime).toHaveBeenCalledWith(1.2)
    expect(container.querySelectorAll('polygon')).toHaveLength(1)
    seek(5)
    expect(container.querySelectorAll('polygon')).toHaveLength(0)
  })

  it('un clip sans contours (404) ou sans adresse : rien n’est dessiné', async () => {
    stubFetch(() => reply({}, 404))
    const { container, unmount } = render(<ClipPlayer path="/clips/1" shapesSrc="/clips/1/shapes" onClose={vi.fn()} />)
    await act(flush)
    seek(1)
    expect(container.querySelector('polygon')).toBeNull()
    unmount()
    const spy = stubFetch(() => reply(FRAMES))
    render(<ClipPlayer path="/clips/1" onClose={vi.fn()} />)
    await act(flush)
    expect(spy).not.toHaveBeenCalled()
  })

  it('démonté avant la réponse, rien n’est gardé', async () => {
    stubFetch(() => reply(FRAMES))
    const { unmount } = render(<ClipPlayer path="/clips/1" shapesSrc="/clips/1/shapes" onClose={vi.fn()} />)
    unmount()
    await act(flush)
  })
})
