import { describe, expect, it } from 'vitest'
import type { CameraEnergy, LampEnergy, MachineEnergy } from '@/types'
import { buildEnergyTree, energyFigures, sumNode } from './energyTree'

const cameras: CameraEnergy = {
  since: '2026-11-08T12:00:00.000Z',
  cameras: [
    { camera: 'a', kwh: 0.1, cost: 0.02, watts: 5 },
    { camera: 'b', kwh: 0.2, cost: 0.03, watts: null },
  ],
  total: { kwh: 0.3, cost: 0.05 },
}
const lamps: LampEnergy = {
  since: '2026-11-07T12:00:00.000Z',
  lamps: [{ lamp: 'Spot', kwh: 0.5, cost: 0.07, watts: 4.25 }],
  total: { kwh: 0.5, cost: 0.07 },
}
const machine: MachineEnergy = { since: null, kwh: 1, cost: 0.15, watts: 10 }

describe('energyTree', () => {
  it('sumNode : somme des enfants, une puissance inconnue compte pour 0', () => {
    const node = sumNode('x', 'X', buildEnergyTree(cameras, null, null)!.children[0].children)
    expect(node).toMatchObject({ watts: 5, kwh: 0.1 + 0.2, cost: 0.02 + 0.03 })
  })

  it('arbre complet : racine, trois branches, feuilles par appareil', () => {
    const root = buildEnergyTree(cameras, lamps, machine)!
    expect(root.label).toBe('Consommation électrique (estimation)')
    expect(root.children.map((c) => [c.id, c.label])).toEqual([
      ['cameras', 'Caméras'],
      ['lamps', 'Lampes Hue'],
      ['machine', 'Mini PC (processeur seul)'],
    ])
    expect(root.children[0].children.map((c) => c.id)).toEqual(['camera:a', 'camera:b'])
    expect(root.children[1].children.map((c) => c.id)).toEqual(['lamp:Spot'])
    expect(root.children[2].children).toEqual([])
    expect(root.watts).toBeCloseTo(5 + 4.25 + 10)
    expect(root.kwh).toBeCloseTo(0.3 + 0.5 + 1)
    expect(root.cost).toBeCloseTo(0.05 + 0.07 + 0.15)
  })

  it('une source absente n’a pas de branche ; aucune source, pas d’arbre', () => {
    expect(buildEnergyTree(null, lamps, null)!.children.map((c) => c.id)).toEqual(['lamps'])
    expect(buildEnergyTree(null, null, null)).toBeNull()
  })

  it('les trois chiffres : W à une décimale, kWh à trois, euros au centime ; « — » sans puissance connue', () => {
    const root = buildEnergyTree(cameras, lamps, machine)!
    expect(energyFigures(root)).toBe('19,3 W · 1,800 kWh · 0,27 €')
    expect(energyFigures(root.children[0].children[1])).toBe('— W · 0,200 kWh · 0,03 €')
  })
})
