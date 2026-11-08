import { render, screen } from '@testing-library/react'
import ValueChips from './ValueChips'

describe('ValueChips', () => {
  it('un bloc par valeur, dans l ordre', () => {
    const { container } = render(<ValueChips values={['9,5 °C', '60 %']} />)
    const chips = Array.from(container.querySelectorAll('span')).map((chip) => chip.textContent)
    expect(chips).toEqual(['9,5 °C', '60 %'])
  })

  it('accepte deux valeurs identiques', () => {
    render(<ValueChips values={['1', '1']} />)
    expect(screen.getAllByText('1')).toHaveLength(2)
  })
})
