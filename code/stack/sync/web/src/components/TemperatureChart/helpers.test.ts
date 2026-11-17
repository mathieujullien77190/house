import { describe, expect, it } from 'vitest'
import { buildSeries, labelOf, timeLabels } from './helpers'

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

describe('timeLabels', () => {
  const now = Date.UTC(2026, 10, 17, 12, 0) / 1000
  it('donne cinq repères, du plus ancien au plus récent', () => {
    for (const days of [1, 7, 365]) expect(timeLabels(now, days)).toHaveLength(5)
  })
  it('les heures sur 24 h, les jours sur une semaine, les mois sur l’année', () => {
    expect(timeLabels(now, 1)[0]).toMatch(/^\d{2}:\d{2}$/)
    expect(timeLabels(now, 7)[0]).toMatch(/^\d{2}\/\d{2}$/)
    expect(timeLabels(now, 365)[4]).toMatch(/2026|26/)
  })
})

describe('labelOf', () => {
  it('rend la météo et les colonnes lisibles', () => {
    expect(labelOf('meteo')).toBe('Météo')
    expect(labelOf('clim_chambre_matou')).toBe('Clim chambre matou')
  })
})
