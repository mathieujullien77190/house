import { fireEvent, render, screen } from '@testing-library/react'
import HeatingPanel from './HeatingPanel'
import type { HeatingPanelProps } from './types'

const props = (over: Partial<HeatingPanelProps> = {}): HeatingPanelProps => ({
  enabledLabel: 'Activer la règle',
  enabled: true,
  onEnabledChange: vi.fn(),
  fields: [
    { id: 't', label: 'Température (°C)', value: '3', kind: 'number', onChange: vi.fn() },
    { id: 'p', label: 'Prix', value: '0,1589', kind: 'decimal', hint: 'TTC', onChange: vi.fn() },
    { id: 'h', label: 'Début', value: '23:10', kind: 'time', onChange: vi.fn() },
  ],
  saveLabel: 'Enregistrer',
  saving: false,
  onSave: vi.fn(),
  ...over,
})

describe('HeatingPanel', () => {
  it('montre la case, les champs et leur aide', () => {
    render(<HeatingPanel {...props()} />)
    expect(screen.getByRole('checkbox', { name: 'Activer la règle' })).toBeChecked()
    expect(screen.getByLabelText(/Température/)).toHaveValue(3)
    expect(screen.getByLabelText(/Prix/)).toHaveValue('0,1589')
    expect(screen.getByText('TTC')).toBeInTheDocument()
    expect(screen.getByLabelText(/Début/)).toHaveValue('23:10')
  })

  it('renvoie les changements et l’enregistrement', () => {
    const p = props()
    render(<HeatingPanel {...p} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(p.onEnabledChange).toHaveBeenCalledWith(false)
    fireEvent.change(screen.getByLabelText(/Température/), { target: { value: '4' } })
    expect(p.fields[0].onChange).toHaveBeenCalledWith('4')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(p.onSave).toHaveBeenCalledTimes(1)
  })

  it('bloque le bouton pendant l’envoi, montre l’erreur', () => {
    render(<HeatingPanel {...props({ saving: true, error: 'refusé' })} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    expect(screen.getByText('refusé')).toBeInTheDocument()
  })
})
