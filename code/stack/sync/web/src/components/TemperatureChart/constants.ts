import type { SliceTone } from '@house/ui'

/** Les jours montrés par le graphique. */
export const DAYS = 7
export const WEATHER_COLUMN = 'meteo'
export const WEATHER_LABEL = 'Météo'
export const UNIT = '°C'
export const CHART_LABEL = 'Températures des 7 derniers jours : météo, pompes à chaleur et détecteurs Hue'
export const EMPTY_TEXT = 'Pas encore assez de relevés (un par heure).'
export const START_LABEL = 'il y a 7 jours'
export const END_LABEL = 'maintenant'
/** Les couleurs des séries, dans l'ordre : la météo en premier, puis les pompes à chaleur et les détecteurs. */
export const TONES: SliceTone[] = ['accent', 'orange', 'green', 'danger', 'muted']
