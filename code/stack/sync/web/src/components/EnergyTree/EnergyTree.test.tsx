import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { EnergyNode } from '@/types'
import EnergyTree from './EnergyTree'

const leaf = (id: string, watts: number | null): EnergyNode => ({ id, label: id, watts, kwh: 0.5, cost: 0.08, children: [] })
const tree: EnergyNode = {
  id: 'root',
  label: 'Tout',
  watts: 7,
  kwh: 1,
  cost: 0.16,
  children: [{ id: 'g', label: 'Groupe', watts: 7, kwh: 1, cost: 0.16, children: [leaf('a', 7), leaf('b', null)] }],
}

describe('EnergyTree', () => {
  it('dessine la racine, ses groupes et ses feuilles avec les trois chiffres de chacun', () => {
    render(<EnergyTree node={tree} />)
    expect(screen.getByText('Tout')).toBeTruthy()
    expect(screen.getByText('Groupe')).toBeTruthy()
    expect(screen.getAllByText('7,0 W · 1,000 kWh · 0,16 €')).toHaveLength(2)
    expect(screen.getByText('7,0 W · 0,500 kWh · 0,08 €')).toBeTruthy()
    expect(screen.getByText('— W · 0,500 kWh · 0,08 €')).toBeTruthy()
  })

  it('une feuille seule est une simple ligne, sans section repliable', () => {
    const { container } = render(<EnergyTree node={leaf('seule', 3)} />)
    expect(container.querySelector('details')).toBeNull()
    expect(screen.getByText('seule')).toBeTruthy()
  })
})
