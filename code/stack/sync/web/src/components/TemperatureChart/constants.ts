import type { SliceTone } from '@house/ui'

export type RangeId = 'day' | 'week' | 'month' | 'year'
/** Les durées proposées (jours) et leur nom sur les boutons. */
export const RANGES: { id: RangeId; label: string; days: number }[] = [
  { id: 'day', label: '24 h', days: 1 },
  { id: 'week', label: 'Semaine', days: 7 },
  { id: 'month', label: 'Mois', days: 30 },
  { id: 'year', label: 'Année', days: 365 },
]
/** Les jours de chaque durée. */
export const RANGE_DAYS: Record<RangeId, number> = { day: 1, week: 7, month: 30, year: 365 }
export const DEFAULT_RANGE: RangeId = 'week'
export const RANGES_LABEL = 'Période du graphique'
/** Le nombre de repères de temps sous le graphique. */
export const TIME_MARKS = 5
export const DAY_SECONDS = 86_400
export const WEATHER_COLUMN = 'meteo'
export const WEATHER_LABEL = 'Météo'
export const UNIT = '°C'
export const CHART_LABEL = 'Températures : météo (bâtons), pompes à chaleur et détecteurs Hue'
export const EMPTY_TEXT = 'Pas encore assez de relevés (un par heure).'
/** Les couleurs des séries, dans l'ordre : la météo en premier, puis les pompes à chaleur et les détecteurs. */
export const TONES: SliceTone[] = ['accent', 'orange', 'green', 'danger', 'muted']
