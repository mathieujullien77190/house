import { fireEvent, render, screen } from '@testing-library/react'
import FastScroll from './FastScroll'
import { speedOf } from './helpers'
import { FASTER_LABEL, NORMAL_RATE, RATES, SLOWER_LABEL } from './constants'

describe('FastScroll', () => {
  it('écrit la vitesse entre les flèches', () => {
    render(<FastScroll rate={NORMAL_RATE} onRate={vi.fn()} />)
    expect(RATES[NORMAL_RATE]).toBe(1)
    expect(screen.getByText('×1')).toBeInTheDocument()
  })

  it('une vitesse négative s’écrit avec ◀', () => {
    render(<FastScroll rate={0} onRate={vi.fn()} />)
    expect(screen.getByText('◀ ×600')).toBeInTheDocument()
  })

  it('▶ monte d’un cran, ◀ descend d’un cran', () => {
    const onRate = vi.fn()
    render(<FastScroll rate={NORMAL_RATE} onRate={onRate} />)
    fireEvent.click(screen.getByLabelText(FASTER_LABEL))
    expect(onRate).toHaveBeenLastCalledWith(NORMAL_RATE + 1)
    fireEvent.click(screen.getByLabelText(SLOWER_LABEL))
    expect(onRate).toHaveBeenLastCalledWith(NORMAL_RATE - 1)
  })

  it('les bornes désactivent la flèche', () => {
    const { rerender } = render(<FastScroll rate={0} onRate={vi.fn()} />)
    expect(screen.getByLabelText(SLOWER_LABEL)).toBeDisabled()
    expect(screen.getByLabelText(FASTER_LABEL)).toBeEnabled()
    rerender(<FastScroll rate={RATES.length - 1} onRate={vi.fn()} />)
    expect(screen.getByLabelText(FASTER_LABEL)).toBeDisabled()
    expect(screen.getByLabelText(SLOWER_LABEL)).toBeEnabled()
  })

  it('un rang hors liste vaut ×1', () => {
    render(<FastScroll rate={99} onRate={vi.fn()} />)
    expect(screen.getByText('×1')).toBeInTheDocument()
  })
})

describe('speedOf', () => {
  it('la vitesse d’un rang, ×1 hors liste', () => {
    expect(speedOf(0)).toBe(-600)
    expect(speedOf(NORMAL_RATE)).toBe(1)
    expect(speedOf(99)).toBe(1)
  })
})
