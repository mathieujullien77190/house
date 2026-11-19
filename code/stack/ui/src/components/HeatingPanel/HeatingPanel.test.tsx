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
    expect(screen.getByRole('tab', { name: 'Oui' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tablist', { name: 'Activer la règle' })).toBeInTheDocument()
    expect(screen.getByLabelText('Température (°C)', { selector: 'input' })).toHaveValue(3)
    expect(screen.getByLabelText('Prix', { selector: 'input' })).toHaveValue('0,1589')
    expect(screen.getByText('TTC')).toBeInTheDocument()
    expect(screen.getByLabelText('Début', { selector: 'input' })).toHaveValue('23:10')
  })

  it('renvoie les changements et l’enregistrement', () => {
    const p = props()
    render(<HeatingPanel {...p} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Non' }))
    expect(p.onEnabledChange).toHaveBeenCalledWith(false)
    fireEvent.change(screen.getByLabelText('Température (°C)', { selector: 'input' }), { target: { value: '4' } })
    expect(p.fields[0].onChange).toHaveBeenCalledWith('4')
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(p.onSave).toHaveBeenCalledTimes(1)
  })

  it('« − » et « + » changent un entier d’un pas, sans passer sous 0', () => {
    const p = props()
    render(<HeatingPanel {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Augmenter · Température (°C)' }))
    expect(p.fields[0].onChange).toHaveBeenLastCalledWith('4')
    fireEvent.click(screen.getByRole('button', { name: 'Diminuer · Température (°C)' }))
    expect(p.fields[0].onChange).toHaveBeenLastCalledWith('2')
  })

  it('« + » d’un décimal garde la virgule ; l’heure n’a pas de boutons', () => {
    const p = props()
    render(<HeatingPanel {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Augmenter · Prix' }))
    expect(p.fields[1].onChange).toHaveBeenLastCalledWith('0,6589')
    expect(screen.queryByRole('button', { name: /Début/ })).toBeNull()
  })

  it('le bloc étroit a aussi ses boutons', () => {
    render(<HeatingPanel {...props({ compact: true })} />)
    expect(screen.getAllByRole('button', { name: /Diminuer/ })).toHaveLength(2)
  })

  it('bloque le bouton pendant l’envoi, montre l’erreur', () => {
    render(<HeatingPanel {...props({ saving: true, error: 'refusé' })} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    expect(screen.getByText('refusé')).toBeInTheDocument()
  })
})

describe('HeatingPanel compact', () => {
  const fields = [
    { id: 'a', label: 'Température (°C)', value: '3', kind: 'decimal' as const, onChange: vi.fn() },
    { id: 'b', label: 'Durée (min)', value: '5', kind: 'number' as const, hint: 'une aide', onChange: vi.fn() },
  ]
  const props = { enabledLabel: 'Activer', enabled: true, onEnabledChange: vi.fn(), fields, saveLabel: 'Enregistrer', saving: false, onSave: vi.fn() }

  it('dans un bloc étroit : deux colonnes quelle que soit la largeur de l’écran et textes plus petits', () => {
    const { container } = render(<HeatingPanel {...props} compact />)
    expect(container.querySelector('.grid')?.className).toContain('grid-cols-2')
    expect(container.querySelector('.grid')?.className).not.toContain('lg:grid-cols-4')
    expect(container.querySelectorAll('label')[1]?.className).toContain('text-[0.72rem]')
    expect(screen.getByText('une aide').className).toContain('text-[0.68rem]')
    expect(container.querySelector('input[type=text]')?.className).toContain('py-0.5')
  })

  it('par défaut : la mise en page large (quatre colonnes dès 1024 px)', () => {
    const { container } = render(<HeatingPanel {...props} />)
    expect(container.querySelector('.grid')?.className).toContain('lg:grid-cols-4')
  })
})
