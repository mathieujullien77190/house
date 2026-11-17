import type { ChartSeries } from '@house/ui'
import type { TemperaturePoint } from '@/types'
import { TONES, WEATHER_COLUMN, WEATHER_LABEL } from './constants'

/** Le nom lisible d'une colonne de la table (`meteo` devient « Météo », `clim_chambre_matou` « Clim chambre matou »). */
export const labelOf = (column: string): string => (column === WEATHER_COLUMN ? WEATHER_LABEL : `${column.charAt(0).toUpperCase()}${column.slice(1).replaceAll('_', ' ')}`)

/** Les points groupés par nom (météo, clim, détecteur) en séries ; chaque nom garde sa couleur selon son rang. */
export const buildSeries = (points: TemperaturePoint[]): ChartSeries[] => {
  const byName = new Map<string, ChartSeries>()
  for (const point of points) {
    let series = byName.get(point.name)
    if (!series) {
      series = { id: point.name, label: labelOf(point.name), tone: TONES[byName.size % TONES.length], points: [] }
      byName.set(point.name, series)
    }
    series.points.push({ x: point.at, y: point.celsius })
  }
  return [...byName.values()]
}
