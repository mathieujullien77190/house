import { render, screen } from '@testing-library/react'
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
})
