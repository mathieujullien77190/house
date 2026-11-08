import { render, screen } from '@testing-library/react'
import LampDot from './LampDot'
import { BRIGHTNESS_FLOOR, DOT_OFF_CLASS, DOT_ON_CLASS, DOT_UNREACHABLE_CLASS } from './constants'

const dot = () => screen.getByRole('img').firstElementChild as HTMLElement

describe('LampDot', () => {
  it('se nomme par son étiquette (nom accessible et infobulle)', () => {
    render(<LampDot on reachable label="Salon" />)
    expect(screen.getByRole('img', { name: 'Salon' })).toHaveAttribute('title', 'Salon')
  })

  it('allumée : couleur allumée, pleine opacité sans luminosité', () => {
    render(<LampDot on reachable label="Salon" />)
    expect(dot()).toHaveClass(...DOT_ON_CLASS.split(' '))
    expect(dot().style.opacity).toBe('1')
  })

  it('éteinte : couleur éteinte', () => {
    render(<LampDot on={false} reachable label="Salon" />)
    expect(dot()).toHaveClass(...DOT_OFF_CLASS.split(' '))
  })

  it('injoignable : prime sur allumée', () => {
    render(<LampDot on reachable={false} label="Salon" />)
    expect(dot()).toHaveClass(...DOT_UNREACHABLE_CLASS.split(' '))
    expect(dot()).not.toHaveClass(...DOT_ON_CLASS.split(' '))
  })

  it('la luminosité devient l opacité, avec un plancher et un plafond', () => {
    const { rerender } = render(<LampDot on reachable brightness={254} label="x" />)
    expect(Number(dot().style.opacity)).toBeCloseTo(1)
    rerender(<LampDot on reachable brightness={0} label="x" />)
    expect(Number(dot().style.opacity)).toBeCloseTo(BRIGHTNESS_FLOOR)
    rerender(<LampDot on reachable brightness={127} label="x" />)
    expect(Number(dot().style.opacity)).toBeCloseTo(BRIGHTNESS_FLOOR + (1 - BRIGHTNESS_FLOOR) * 0.5)
    rerender(<LampDot on reachable brightness={1000} label="x" />)
    expect(Number(dot().style.opacity)).toBeCloseTo(1)
    rerender(<LampDot on reachable brightness={-50} label="x" />)
    expect(Number(dot().style.opacity)).toBeCloseTo(BRIGHTNESS_FLOOR)
  })

  it('ignore la luminosité d une lampe éteinte ou injoignable', () => {
    const { rerender } = render(<LampDot on={false} reachable brightness={10} label="x" />)
    expect(dot().style.opacity).toBe('1')
    rerender(<LampDot on reachable={false} brightness={10} label="x" />)
    expect(dot().style.opacity).toBe('1')
  })
})
