import { describe, expect, it } from 'vitest'
import { buildSeries, labelOf } from './helpers'

describe('buildSeries', () => {
  it('groupe par nom, garde l’ordre et donne une couleur par rang (en boucle)', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F']
    const points = names.flatMap((name, index) => [{ at: 1, name, celsius: index }, { at: 2, name, celsius: index + 1 }])
    const series = buildSeries(points)
    expect(series.map((s) => s.id)).toEqual(names)
    expect(series[0].points).toEqual([{ x: 1, y: 0 }, { x: 2, y: 1 }])
    expect(series[5].tone).toBe(series[0].tone)
    expect(series[1].tone).not.toBe(series[0].tone)
  })
  it('sans point, aucune série', () => {
    expect(buildSeries([])).toEqual([])
  })
})

describe('labelOf', () => {
  it('rend la météo et les colonnes lisibles', () => {
    expect(labelOf('meteo')).toBe('Météo')
    expect(labelOf('clim_chambre_matou')).toBe('Clim chambre matou')
  })
})
