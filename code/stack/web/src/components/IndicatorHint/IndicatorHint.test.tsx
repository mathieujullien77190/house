import { act, fireEvent, render, screen } from '@testing-library/react'
import IndicatorHint from './IndicatorHint'
import { HINT_DELAY_MS } from './constants'

const hint = () => screen.queryByRole('tooltip')
const trigger = () => screen.getByRole('button', { name: 'Aide' })

describe('IndicatorHint', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fermée au départ ; un clic ouvre l’infobulle, un second la ferme', () => {
    render(<IndicatorHint text="Aide">X</IndicatorHint>)
    expect(hint()).toBeNull()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger())
    expect(hint()).toHaveTextContent('Aide')
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(trigger())
    expect(hint()).toBeNull()
  })

  it('le clic n’atteint pas ce qui est dessous (la vignette de la caméra)', () => {
    const below = vi.fn()
    render(
      <div onClick={below}>
        <IndicatorHint text="Aide">X</IndicatorHint>
      </div>,
    )
    fireEvent.click(trigger())
    expect(below).not.toHaveBeenCalled()
  })

  it('Échap la ferme, une autre touche non', () => {
    render(<IndicatorHint text="Aide">X</IndicatorHint>)
    fireEvent.click(trigger())
    fireEvent.keyDown(document, { key: 'a' })
    expect(hint()).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(hint()).toBeNull()
  })

  it('un clic ailleurs la ferme, un clic sur l’indicateur non', () => {
    render(<IndicatorHint text="Aide">X</IndicatorHint>)
    fireEvent.click(trigger())
    fireEvent.pointerDown(trigger())
    expect(hint()).not.toBeNull()
    fireEvent.pointerDown(document.body)
    expect(hint()).toBeNull()
  })

  it('elle se ferme seule après quelques secondes', () => {
    render(<IndicatorHint text="Aide">X</IndicatorHint>)
    fireEvent.click(trigger())
    act(() => void vi.advanceTimersByTime(HINT_DELAY_MS - 1))
    expect(hint()).not.toBeNull()
    act(() => void vi.advanceTimersByTime(1))
    expect(hint()).toBeNull()
  })

  it('démontée ouverte, elle ne laisse rien derrière elle', () => {
    const { unmount } = render(<IndicatorHint text="Aide">X</IndicatorHint>)
    fireEvent.click(trigger())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
