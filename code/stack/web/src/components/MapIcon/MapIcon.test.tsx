import { render, screen } from '@testing-library/react'
import MapIcon from './MapIcon'

describe('MapIcon', () => {
  it('un rond blanc à bordure noire avec son icône et son nom', () => {
    render(
      <MapIcon label="Caméra">
        <i data-testid="inside" />
      </MapIcon>,
    )
    const round = screen.getByRole('img', { name: 'Caméra' })
    expect(round).toContainElement(screen.getByTestId('inside'))
    expect(round.className).toContain('bg-white')
    expect(round.className).toContain('border-black')
    expect(round.getAttribute('title')).toBe('Caméra')
    expect(round.getAttribute('style')).toBeNull()
    expect(screen.queryByTestId('map-icon-dot')).toBeNull()
  })

  it('la couleur de l’icône et la pastille d’état sur le contour', () => {
    render(
      <MapIcon label="Lampe" color="rgb(255, 128, 0)" dot="rgb(0, 200, 0)">
        <i />
      </MapIcon>,
    )
    expect(screen.getByRole('img', { name: 'Lampe' }).getAttribute('style')).toContain('rgb(255, 128, 0)')
    expect(screen.getByTestId('map-icon-dot').getAttribute('style')).toContain('rgb(0, 200, 0)')
  })
})
