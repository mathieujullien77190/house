import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import FullscreenBox from './FullscreenBox'

let fullscreen: Element | null = null

beforeEach(() => {
  fullscreen = null
  Object.defineProperty(document, 'fullscreenElement', { get: () => fullscreen, configurable: true })
  document.exitFullscreen = vi.fn().mockResolvedValue(undefined)
  HTMLElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
})

describe('FullscreenBox', () => {
  it('passe en plein écran puis en sort', () => {
    render(<FullscreenBox>contenu</FullscreenBox>)
    fireEvent.click(screen.getByRole('button'))
    expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalled()
    fullscreen = document.body
    fireEvent.click(screen.getByRole('button'))
    expect(document.exitFullscreen).toHaveBeenCalled()
  })

  it('le bouton change de nom quand cette boîte est en plein écran', () => {
    const { container } = render(<FullscreenBox>contenu</FullscreenBox>)
    const before = screen.getByRole('button').getAttribute('aria-label')
    fullscreen = container.firstElementChild
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(screen.getByRole('button').getAttribute('aria-label')).not.toBe(before)
    fullscreen = document.body
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(before)
  })

  it('un plein écran ou une sortie refusés sont ignorés', async () => {
    HTMLElement.prototype.requestFullscreen = vi.fn().mockRejectedValue(new Error('non'))
    document.exitFullscreen = vi.fn().mockRejectedValue(new Error('non'))
    render(<FullscreenBox>contenu</FullscreenBox>)
    fireEvent.click(screen.getByRole('button'))
    fullscreen = document.body
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
  })
})
