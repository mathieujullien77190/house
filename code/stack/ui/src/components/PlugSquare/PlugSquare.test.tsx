import { render, screen } from '@testing-library/react'
import PlugSquare from './PlugSquare'
import { SQUARE_OFF_CLASS, SQUARE_ON_CLASS } from './constants'

describe('PlugSquare', () => {
  it('allumée : carré vert, nommé par son étiquette', () => {
    render(<PlugSquare on label="Chauffage" />)
    const square = screen.getByRole('img', { name: 'Chauffage' })
    expect(square).toHaveAttribute('title', 'Chauffage')
    expect(square.firstElementChild).toHaveClass(...SQUARE_ON_CLASS.split(' '))
  })

  it('éteinte : carré rouge', () => {
    render(<PlugSquare on={false} label="Chauffage" />)
    const square = screen.getByRole('img').firstElementChild
    expect(square).toHaveClass(...SQUARE_OFF_CLASS.split(' '))
    expect(square).not.toHaveClass(...SQUARE_ON_CLASS.split(' '))
  })
})
