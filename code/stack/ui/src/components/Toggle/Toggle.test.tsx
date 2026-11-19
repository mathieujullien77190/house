import { fireEvent, render, screen } from '@testing-library/react'
import Toggle from './Toggle'
import { toggleOptions } from './helpers'

describe('toggleOptions', () => {
  it('Arrêt puis Marche, avec les textes donnés', () => {
    expect(toggleOptions('On', 'Off')).toEqual([
      { id: 'off', label: 'Off' },
      { id: 'on', label: 'On' },
    ])
  })
})

describe('Toggle', () => {
  it('Marche / Arrêt par défaut, l état du parent est sélectionné', () => {
    render(<Toggle label="Prise" checked onChange={() => undefined} />)
    expect(screen.getByRole('tablist', { name: 'Prise' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Marche' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Arrêt' })).toHaveAttribute('aria-selected', 'false')
  })

  it('les textes se changent', () => {
    render(<Toggle label="Lampe" checked={false} onText="ON" offText="OFF" onChange={() => undefined} />)
    expect(screen.getByRole('tab', { name: 'OFF' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'ON' })).toBeInTheDocument()
  })

  it('n appelle le parent que quand l état change', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Toggle label="Prise" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Arrêt' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Marche' }))
    expect(onChange).toHaveBeenLastCalledWith(true)
    rerender(<Toggle label="Prise" checked onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Marche' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('tab', { name: 'Arrêt' }))
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('désactivé : grisé', () => {
    render(<Toggle label="Prise" checked disabled onChange={() => undefined} />)
    for (const tab of screen.getAllByRole('tab')) expect(tab).toBeDisabled()
  })
})
