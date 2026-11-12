import { render, screen } from '@testing-library/react'
import StatusDot from './StatusDot'
import { DOT_STATE_CLASS, STATUS_DOT_DIAMETER } from './constants'

describe('StatusDot', () => {
  it.each(['on', 'off', 'missing'] as const)('l’état %s prend sa couleur', (state) => {
    render(<StatusDot state={state} label="Pastille" />)
    expect(screen.getByRole('img', { name: 'Pastille' })).toHaveClass(...DOT_STATE_CLASS[state].split(' '))
  })

  it('a la taille commune avec le plan et se nomme par son étiquette', () => {
    render(<StatusDot state="on" label="Allumée" />)
    const dot = screen.getByRole('img', { name: 'Allumée' })
    expect(dot).toHaveAttribute('title', 'Allumée')
    expect(dot.style.width).toBe(`${STATUS_DOT_DIAMETER}px`)
    expect(dot.style.height).toBe(`${STATUS_DOT_DIAMETER}px`)
  })

  it('sans étiquette, la pastille est muette', () => {
    const { container } = render(<StatusDot state="off" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.firstElementChild).not.toHaveAttribute('aria-label')
  })
})
