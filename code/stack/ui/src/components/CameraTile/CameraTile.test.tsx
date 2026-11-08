import { fireEvent, render, screen } from '@testing-library/react'
import CameraTile from './CameraTile'
import { OPEN_PREFIX, TILE_ALERT_CLASS, TILE_CLASS } from './constants'

const renderTile = (extra: Partial<Parameters<typeof CameraTile>[0]> = {}) => {
  const onOpen = vi.fn()
  const view = render(<CameraTile name="Volière extérieur" media={<img alt="direct" />} onOpen={onOpen} {...extra} />)
  return { onOpen, ...view }
}

describe('CameraTile', () => {
  it('le nom accentué du bouton d ouverture est lisible', () => {
    expect(OPEN_PREFIX).toBe('Ouvrir la caméra ')
  })

  it('montre le média et le nom ; le bouton transparent ouvre la caméra', () => {
    const { onOpen } = renderTile()
    expect(screen.getByAltText('direct')).toBeInTheDocument()
    expect(screen.getByText('Volière extérieur')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `${OPEN_PREFIX}Volière extérieur` }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('l alerte (caméra éteinte) change le cadre', () => {
    const { container, rerender } = renderTile()
    expect(container.firstElementChild?.className).toBe(TILE_CLASS)
    rerender(<CameraTile name="N" media={null} onOpen={() => undefined} alert />)
    expect(container.firstElementChild?.className).toBe(TILE_ALERT_CLASS)
  })

  it('montre la superposition et la légende seulement si elles existent', () => {
    const { rerender } = renderTile()
    expect(screen.queryByText('9 °C')).toBeNull()
    expect(screen.queryByText('Dernière image')).toBeNull()
    rerender(<CameraTile name="N" media={null} onOpen={() => undefined} overlay="9 °C" caption="Dernière image" />)
    expect(screen.getByText('9 °C')).toBeInTheDocument()
    expect(screen.getByText('Dernière image')).toBeInTheDocument()
  })

  it('sans pied, aucun pied', () => {
    renderTile()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('un pied sans action est un simple texte', () => {
    renderTile({ footer: 'En ligne' })
    expect(screen.getByText('En ligne').tagName).toBe('DIV')
  })

  it('un pied avec onOpenFooter est un bouton à part', () => {
    const onOpenFooter = vi.fn()
    const { onOpen } = renderTile({ footer: 'Détail', onOpenFooter })
    fireEvent.click(screen.getByRole('button', { name: 'Détail' }))
    expect(onOpenFooter).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })
})
