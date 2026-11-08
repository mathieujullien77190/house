import { fireEvent, render, screen } from '@testing-library/react'
import TableFilters from './TableFilters'
import type { DateFilter, MatchFilter } from './types'

const match = (extra: Partial<MatchFilter> = {}): MatchFilter => ({
  label: 'Caméra',
  allLabel: 'Toutes',
  value: '',
  options: ['nord', 'sud'],
  onChange: () => undefined,
  ...extra,
})
const date = (extra: Partial<DateFilter> = {}): DateFilter => ({ label: 'Jour', value: '', onChange: () => undefined, ...extra })

const optionLabels = () => screen.getAllByRole('option').map((option) => option.textContent?.replace('✓', ''))

describe('TableFilters', () => {
  it('sans filtre, ne montre que les enfants', () => {
    render(
      <TableFilters>
        <span>onglets</span>
      </TableFilters>,
    )
    expect(screen.getByText('onglets')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('la liste propose « tout » puis les valeurs', () => {
    render(<TableFilters match={match()} />)
    expect(screen.getByRole('combobox', { name: 'Caméra' })).toHaveTextContent('Toutes')
    fireEvent.click(screen.getByRole('combobox'))
    expect(optionLabels()).toEqual(['Toutes', 'nord', 'sud'])
  })

  it('choisir une valeur la donne au parent', () => {
    const onChange = vi.fn()
    render(<TableFilters match={match({ onChange })} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: 'sud' }))
    expect(onChange).toHaveBeenCalledWith('sud')
  })

  it('une valeur choisie hors liste y reste, en tête', () => {
    render(<TableFilters match={match({ value: 'est' })} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('est')
    fireEvent.click(screen.getByRole('combobox'))
    expect(optionLabels()).toEqual(['Toutes', 'est', 'nord', 'sud'])
  })

  it('une valeur choisie présente dans la liste n est pas dupliquée', () => {
    render(<TableFilters match={match({ value: 'nord' })} />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(optionLabels()).toEqual(['Toutes', 'nord', 'sud'])
  })

  it('le jour choisi est renvoyé au parent', () => {
    const onChange = vi.fn()
    const { container } = render(<TableFilters date={date({ onChange })} />)
    const input = container.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2026-11-07' } })
    expect(onChange).toHaveBeenCalledWith('2026-11-07')
  })

  it('« Effacer » n apparaît que si un filtre est actif', () => {
    const clear = { label: 'Effacer les filtres', onClear: vi.fn() }
    const { rerender } = render(<TableFilters match={match()} date={date()} clear={clear} />)
    expect(screen.queryByRole('button', { name: clear.label })).toBeNull()
    rerender(<TableFilters match={match({ value: 'nord' })} date={date()} clear={clear} />)
    fireEvent.click(screen.getByRole('button', { name: clear.label }))
    expect(clear.onClear).toHaveBeenCalledTimes(1)
    rerender(<TableFilters match={match()} date={date({ value: '2026-11-07' })} clear={clear} />)
    expect(screen.getByRole('button', { name: clear.label })).toBeInTheDocument()
  })

  it('un seul filtre actif suffit, l autre étant absent', () => {
    const clear = { label: 'Effacer', onClear: () => undefined }
    const { rerender } = render(<TableFilters date={date({ value: '2026-11-07' })} clear={clear} />)
    expect(screen.getByRole('button', { name: 'Effacer' })).toBeInTheDocument()
    rerender(<TableFilters match={match({ value: 'nord' })} clear={clear} />)
    expect(screen.getByRole('button', { name: 'Effacer' })).toBeInTheDocument()
  })

  it('sans bouton demandé, aucun bouton même avec un filtre actif', () => {
    render(<TableFilters match={match({ value: 'nord' })} />)
    expect(screen.queryByRole('button', { name: /effacer/i })).toBeNull()
  })

  it('sans filtre actif ni liste, rien à effacer', () => {
    render(<TableFilters clear={{ label: 'Effacer', onClear: () => undefined }} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
