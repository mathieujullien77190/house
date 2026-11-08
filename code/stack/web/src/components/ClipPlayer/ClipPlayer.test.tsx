import { fireEvent, render, screen } from '@testing-library/react'
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
