import type { ChartSeries } from '@house/ui'
import type { TemperaturePoint } from '@/types'
import { DAY_SECONDS, TIME_MARKS, TONES, WEATHER_COLUMN, WEATHER_LABEL } from './constants'

/** Le nom lisible d'une colonne de la table (`meteo` devient « Météo », `clim_chambre_matou` « Clim chambre matou »). */
export const labelOf = (column: string): string => (column === WEATHER_COLUMN ? WEATHER_LABEL : `${column.charAt(0).toUpperCase()}${column.slice(1).replaceAll('_', ' ')}`)

/** Les repères de temps sous le graphique : `TIME_MARKS` dates réparties de `now - days` à `now` (l'heure sur 24 h, le jour au-delà, le mois sur l'année). */
export const timeLabels = (now: number, days: number): string[] =>
  Array.from({ length: TIME_MARKS }, (_, index) => {
    const date = new Date((now - days * DAY_SECONDS + (days * DAY_SECONDS * index) / (TIME_MARKS - 1)) * 1000)
    if (days <= 1) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    if (days > 60) return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  })

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
