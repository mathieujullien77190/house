import { fireEvent, render, screen } from '@testing-library/react'
import ToggleField from './ToggleField'

describe('ToggleField', () => {
  it('le texte à gauche, Oui / Non à droite, l état du parent sélectionné', () => {
    render(<ToggleField label="Activer" checked onChange={() => undefined} />)
    expect(screen.getByText('Activer')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Activer' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Oui' })).toHaveAttribute('aria-selected', 'true')
  })

  it('renvoie le nouvel état, seulement s il change', () => {
    const onChange = vi.fn()
    render(<ToggleField label="Activer" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Non' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Oui' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('désactivé : grisé', () => {
    render(<ToggleField label="Activer" checked disabled onChange={() => undefined} />)
    expect(screen.getByRole('tab', { name: 'Non' })).toBeDisabled()
  })
})
