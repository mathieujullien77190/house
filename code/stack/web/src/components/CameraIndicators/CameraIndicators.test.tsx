import { fireEvent, render, screen } from '@testing-library/react'
import type { HueLight, PlugState } from '@/types'
import CameraIndicators from './CameraIndicators'
import { lampColor } from './helpers'

const lamp: HueLight = { id: '26', name: 'P', on: true, bri: 100, reachable: true }
const plug = { on: true } as PlugState

describe('CameraIndicators', () => {
  it('sans rien : une rangée vide', () => {
    const { container } = render(<CameraIndicators temperatures={[]} lamp={null} plug={null} />)
    expect(container.firstElementChild).toBeEmptyDOMElement()
  })
  it('températures, rond de la lampe et carré de la prise', () => {
    render(<CameraIndicators temperatures={['9,5 °C']} lamp={lamp} plug={plug} />)
    expect(screen.getByText('9,5 °C')).toBeInTheDocument()
    expect(screen.getByLabelText('Lampe Perruche : allumée')).toBeInTheDocument()
    expect(screen.getByLabelText('Prise : allumée')).toBeInTheDocument()
  })
  it('chaque indicateur s’explique au clic', () => {
    render(<CameraIndicators temperatures={['9,5 °C']} lamp={lamp} plug={plug} rain="rain" />)
    for (const name of ['Température 9,5 °C', 'Lampe Perruche allumée à 39 %', 'Chauffage allumé']) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(screen.getByRole('tooltip')).toHaveTextContent(name)
      fireEvent.click(screen.getByRole('button', { name }))
    }
  })
  it('la pluie : 🌧️ pour la pluie, ☔ pour la forte pluie, rien sinon', () => {
    const { rerender } = render(<CameraIndicators temperatures={[]} lamp={null} plug={null} rain="rain" />)
    expect(screen.getByText('🌧️')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Il pleut/ }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('une image est gardée toutes les 5 secondes')
    rerender(<CameraIndicators temperatures={[]} lamp={null} plug={null} rain="heavy" />)
    expect(screen.getByText('☔')).toBeInTheDocument()
    rerender(<CameraIndicators temperatures={[]} lamp={null} plug={null} rain="off" />)
    expect(screen.queryByText('☔')).toBeNull()
  })
})

describe('CameraIndicators : les ronds de la carte', () => {
  it('la lampe et le chauffage ont le rond blanc à bordure noire de la carte, avec leur icône ; le chauffage a sa pastille verte ou rouge', () => {
    const { rerender } = render(<CameraIndicators temperatures={[]} lamp={lamp} plug={plug} />)
    const round = screen.getByLabelText('Lampe Perruche : allumée')
    expect(round.className).toContain('bg-white')
    expect(round.className).toContain('border-black')
    expect(round.querySelector('svg')).not.toBeNull()
    expect(screen.getByLabelText('Prise : allumée').querySelector('svg')).not.toBeNull()
    expect(screen.getByTestId('map-icon-dot').getAttribute('style')).toContain('--color-green')
    rerender(<CameraIndicators temperatures={[]} lamp={lamp} plug={{ on: false } as PlugState} />)
    expect(screen.getByTestId('map-icon-dot').getAttribute('style')).toContain('--color-danger')
  })

  it('la couleur de l’ampoule : rouge injoignable, grise éteinte, orange allumée et plus pâle quand la luminosité baisse', () => {
    expect(lampColor({ ...lamp, reachable: false })).toBe('var(--color-danger)')
    expect(lampColor({ ...lamp, on: false })).toBe('var(--color-muted)')
    expect(lampColor({ ...lamp, bri: null })).toBe('color-mix(in srgb, var(--color-orange) 100%, white)')
    expect(lampColor({ ...lamp, bri: 254, color: '#33ccff' })).toBe('color-mix(in srgb, #33ccff 100%, white)')
    expect(lampColor({ ...lamp, bri: 0 })).toBe('color-mix(in srgb, var(--color-orange) 25%, white)')
    expect(lampColor({ ...lamp, bri: 9999 })).toBe('color-mix(in srgb, var(--color-orange) 100%, white)')
  })
})
