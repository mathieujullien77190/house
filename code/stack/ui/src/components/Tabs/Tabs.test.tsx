import { fireEvent, render, screen } from '@testing-library/react'
import Tabs from './Tabs'
import { tabClass } from './helpers'
import { ACTIVE_CLASS, COMPACT_ITEM_CLASS, TINY_ITEM_CLASS, IDLE_CLASS, ITEM_CLASS } from './constants'

const options = [
  { id: 'live', label: 'Direct' },
  { id: 'clips', label: 'Clips' },
] as const

describe('tabClass', () => {
  it('distingue actif et inactif', () => {
    expect(tabClass(true)).toBe(`${ITEM_CLASS} ${ACTIVE_CLASS}`)
    expect(tabClass(false)).toBe(`${ITEM_CLASS} ${IDLE_CLASS}`)
  })

  it('a une version basse, de la hauteur d’un bouton', () => {
    expect(tabClass(true, true)).toBe(`${COMPACT_ITEM_CLASS} ${ACTIVE_CLASS}`)
    expect(tabClass(false, true)).toBe(`${COMPACT_ITEM_CLASS} ${IDLE_CLASS}`)
  })
})

describe('Tabs', () => {
  it('un onglet par option, celui de la valeur est sélectionné', () => {
    render(<Tabs label="Vues" options={[...options]} value="clips" onChange={() => undefined} />)
    expect(screen.getByRole('tablist', { name: 'Vues' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Clips' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Direct' })).toHaveAttribute('aria-selected', 'false')
  })

  it('une valeur hors des options n en sélectionne aucun', () => {
    render(<Tabs label="Vues" options={[...options]} value="" onChange={() => undefined} />)
    for (const tab of screen.getAllByRole('tab')) expect(tab).toHaveAttribute('aria-selected', 'false')
  })

  it('un clic donne l identifiant au parent', () => {
    const onChange = vi.fn()
    render(<Tabs label="Vues" options={[...options]} value="live" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Clips' }))
    expect(onChange).toHaveBeenCalledWith('clips')
  })

  it('compact : les onglets prennent la version basse', () => {
    render(<Tabs label="Qualité" options={[...options]} value="live" onChange={() => undefined} compact />)
    expect(screen.getByRole('tab', { name: 'Direct' }).className).toContain(COMPACT_ITEM_CLASS)
  })

  it('tiny : la taille d’un petit bouton, et il prend le pas sur compact', () => {
    render(<Tabs label="Qualité" options={[...options]} value="live" onChange={() => undefined} compact tiny />)
    const tab = screen.getByRole('tab', { name: 'Direct' })
    expect(tab.className).toContain(TINY_ITEM_CLASS)
    expect(tab.className).not.toContain(COMPACT_ITEM_CLASS)
  })
})
