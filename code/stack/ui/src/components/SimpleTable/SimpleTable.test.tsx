import { render, screen, within } from '@testing-library/react'
import SimpleTable from './SimpleTable'

describe('SimpleTable', () => {
  it('montre les titres et une ligne par entrée, chaque cellule étiquetée pour la fiche mobile', () => {
    render(
      <SimpleTable
        columns={['Nom', 'Valeur']}
        keys={['a', 'b']}
        rows={[
          ['Largeur', '4K'],
          ['Cadence', <b key="x">25</b>],
        ]}
      />,
    )
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Nom', 'Valeur'])
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(3)
    const cells = within(rows[2]).getAllByRole('cell')
    expect(cells[0]).toHaveAttribute('data-label', 'Nom')
    expect(cells[1]).toHaveAttribute('data-label', 'Valeur')
    expect(cells[1]).toContainHTML('<b>25</b>')
  })

  it('sans ligne, ne garde que l en-tête', () => {
    render(<SimpleTable columns={['Nom']} keys={[]} rows={[]} />)
    expect(screen.getAllByRole('row')).toHaveLength(1)
  })
})
