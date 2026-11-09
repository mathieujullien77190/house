import { fireEvent, render, screen } from '@testing-library/react'
import type { HueLight, PlugState } from '@/types'
import CameraIndicators from './CameraIndicators'

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
