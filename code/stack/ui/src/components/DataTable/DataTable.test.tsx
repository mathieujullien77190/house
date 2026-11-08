import { fireEvent, render, screen } from '@testing-library/react'
import DataTable from './DataTable'
import type { DataTableProps } from './types'
import { COLLAPSE_ARIA, EMPTY_TEXT, EXPAND_ARIA, LESS_TEXT, MORE_TEXT } from './constants'

const base: DataTableProps = {
  title: 'Événements',
  description: 'Les mouvements détectés',
  detail: '/events',
  columns: ['Caméra', 'Heure'],
  rows: [
    ['voliere-exterieur', '10:00'],
    ['voliere-interieur', '10:05'],
  ],
  keys: ['e1', 'e2'],
  page: 0,
  size: 20,
  total: 2,
  onPage: () => undefined,
}

const renderTable = (extra: Partial<DataTableProps> = {}) => render(<DataTable {...base} {...extra} />)

describe('DataTable de base', () => {
  it('montre titre, description, détail, colonnes et lignes étiquetées', () => {
    renderTable()
    expect(screen.getByRole('heading', { name: 'Événements' })).toBeInTheDocument()
    expect(screen.getByText('Les mouvements détectés')).toBeInTheDocument()
    expect(screen.getByText('/events')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Caméra', 'Heure'])
    const cell = screen.getByText('10:05').closest('td')
    expect(cell).toHaveAttribute('data-label', 'Heure')
    expect(screen.getByText('1 à 2 sur 2')).toBeInTheDocument()
  })

  it('sans onToggle, il n y a pas de bouton de repli et le tableau est ouvert', () => {
    renderTable({ collapsed: true })
    expect(screen.queryByRole('button', { name: COLLAPSE_ARIA })).toBeNull()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('sans ligne, dit « vide » à la place du tableau', () => {
    renderTable({ rows: [], keys: [], total: 0 })
    expect(screen.getByText(EMPTY_TEXT, { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('passe la page au Pager', () => {
    const onPage = vi.fn()
    renderTable({ total: 50, onPage })
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }))
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it('montre les filtres quand le tableau est ouvert', () => {
    renderTable({ filters: <span>filtres</span> })
    expect(screen.getByText('filtres')).toBeInTheDocument()
  })
})

describe('DataTable repliable', () => {
  it('ouvert : le bouton propose de replier', () => {
    const onToggle = vi.fn()
    renderTable({ onToggle, collapsed: false })
    const button = screen.getByRole('button', { name: COLLAPSE_ARIA })
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('replié : ni tableau, ni filtres, ni pagination, et le bouton propose de déplier', () => {
    renderTable({ onToggle: () => undefined, collapsed: true, filters: <span>filtres</span> })
    expect(screen.getByRole('button', { name: EXPAND_ARIA })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText('filtres')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Page suivante' })).toBeNull()
    expect(screen.getByText('Les mouvements détectés')).toBeInTheDocument()
  })

  it('sans onToggle, collapsed est sans effet ; avec onToggle sans collapsed, ouvert', () => {
    renderTable({ onToggle: () => undefined })
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('DataTable avec détails', () => {
  const details = [<p key="d1">détail 1</p>, null]

  it('une ligne avec détail est cliquable ; sans détail non', () => {
    const onRowClick = vi.fn()
    renderTable({ details, onRowClick })
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveAttribute('tabindex', '0')
    expect(rows[1]).toHaveAttribute('aria-expanded', 'false')
    expect(rows[2]).not.toHaveAttribute('tabindex')
    expect(rows[2]).not.toHaveAttribute('aria-expanded')
    expect(screen.getByText(`▾ ${MORE_TEXT}`)).toBeInTheDocument()
    fireEvent.click(rows[2])
    expect(onRowClick).not.toHaveBeenCalled()
    fireEvent.keyDown(rows[2], { key: 'Enter' })
    expect(onRowClick).not.toHaveBeenCalled()
    fireEvent.click(rows[1])
    expect(onRowClick).toHaveBeenCalledWith('e1')
  })

  it('sans onRowClick, rien ne se déplie', () => {
    renderTable({ details, openKey: 'e1' })
    expect(screen.queryByText('détail 1')).toBeNull()
    expect(screen.getAllByRole('row')[1]).not.toHaveAttribute('tabindex')
  })

  it('details plus court que les lignes : les lignes sans entrée n ont pas de détail', () => {
    const onRowClick = vi.fn()
    renderTable({ details: [<p key="d1">détail 1</p>], onRowClick })
    fireEvent.click(screen.getAllByRole('row')[2])
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('la ligne ouverte montre son détail et propose de le masquer', () => {
    renderTable({ details, onRowClick: () => undefined, openKey: 'e1' })
    expect(screen.getByText('détail 1')).toBeInTheDocument()
    expect(screen.getAllByRole('row')[1]).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(`▴ ${LESS_TEXT}`)).toBeInTheDocument()
  })

  it('une autre clé ouverte ne déplie pas cette ligne', () => {
    renderTable({ details, onRowClick: () => undefined, openKey: 'e2' })
    expect(screen.queryByText('détail 1')).toBeNull()
  })

  it('un lien ou un bouton de la ligne garde son clic', () => {
    const onRowClick = vi.fn()
    renderTable({
      details,
      onRowClick,
      rows: [
        [<a key="a" href="#x">lien</a>, <button key="b">bouton</button>],
        ['x', 'y'],
      ],
    })
    fireEvent.click(screen.getByText('lien'))
    fireEvent.click(screen.getByText('bouton'))
    expect(onRowClick).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('row')[1])
    expect(onRowClick).toHaveBeenCalledWith('e1')
  })

  it('Entrée et Espace sur la ligne la déplient, une autre touche non', () => {
    const onRowClick = vi.fn()
    renderTable({ details, onRowClick })
    const row = screen.getAllByRole('row')[1]
    fireEvent.keyDown(row, { key: 'a' })
    expect(onRowClick).not.toHaveBeenCalled()
    expect(fireEvent.keyDown(row, { key: 'Enter' })).toBe(false)
    fireEvent.keyDown(row, { key: ' ' })
    expect(onRowClick).toHaveBeenCalledTimes(2)
  })

  it('une touche dans un champ de la ligne ne la déplie pas', () => {
    const onRowClick = vi.fn()
    renderTable({ details, onRowClick, rows: [[<input key="i" aria-label="champ" />, 'y'], ['x', 'y']] })
    fireEvent.keyDown(screen.getByLabelText('champ'), { key: 'Enter' })
    expect(onRowClick).not.toHaveBeenCalled()
  })
})
