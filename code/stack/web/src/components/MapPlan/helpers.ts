import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { BRIGHTNESS_FLOOR, BRIGHTNESS_MAX, MAP_HOUSE_HEIGHT } from './constants'

export const METERS_PER_DEGREE = 111320
const EARTH_CIRCUMFERENCE_AT_ZOOM_0 = 156543.03392

/** Les mètres par pixel d'une carte à ce niveau de zoom, à cette latitude (tuiles de 256 px). */
export const metersPerPixel = (latitude: number, zoom: number): number =>
  (EARTH_CIRCUMFERENCE_AT_ZOOM_0 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom

/** Le point situé à `east` mètres à l'est et `south` mètres au sud de `origin` (latitude, longitude). */
export const offsetBy = (origin: [number, number], east: number, south: number): [number, number] => [
  origin[0] - south / METERS_PER_DEGREE,
  origin[1] + east / (METERS_PER_DEGREE * Math.cos((origin[0] * Math.PI) / 180)),
]

/** La hauteur de la maison de l'ancien plan des lumières (540 × 300) : la carte l'allonge à `MAP_HOUSE_HEIGHT` pour coller au bâti. */
const OLD_HOUSE_HEIGHT = 300

/** Un point de l'ancien plan des lumières (origine en haut à gauche de la maison) en point du plan de la carte : la maison est poussée de `HOUSE_SHIFT` et allongée. */
export const fromHousePlan = (x: number, y: number): { x: number; y: number } => ({
  x: x + HOUSE_SHIFT,
  y: (y * MAP_HOUSE_HEIGHT) / OLD_HOUSE_HEIGHT,
})

/** Les lampes pas encore placées attendent en rangées au sud de la maison (sur le carrelage), à ces écarts et par rangée de ce nombre. */
const WAITING_STEP = 30
const WAITING_PER_ROW = 17
const WAITING_TOP = 110

/** La place d'attente de la n-ième lampe à placer. */
export const waitingSlot = (index: number): { x: number; y: number } => ({
  x: HOUSE_SHIFT + 16 + (index % WAITING_PER_ROW) * WAITING_STEP,
  y: MAP_HOUSE_HEIGHT + WAITING_TOP + Math.floor(index / WAITING_PER_ROW) * WAITING_STEP,
})

/** L'opacité d'une ampoule : sa luminosité (1 à 254) entre le plancher et le plein ; plein si elle est éteinte, injoignable ou sans luminosité. */
export const bulbOpacity = (on: boolean, reachable: boolean, brightness: number | null | undefined): number =>
  on && reachable && brightness !== null && brightness !== undefined
    ? BRIGHTNESS_FLOOR + (1 - BRIGHTNESS_FLOOR) * Math.min(1, Math.max(0, brightness / BRIGHTNESS_MAX))
    : 1

/** Le nom d'une ampoule avec sa luminosité en pourcentage quand elle est allumée (« Perruche · 60 % »). */
export const bulbLabel = (name: string, on: boolean, reachable: boolean, brightness: number | null | undefined): string =>
  on && reachable && brightness !== null && brightness !== undefined
    ? `${name} · ${Math.round((brightness / BRIGHTNESS_MAX) * 100)} %`
    : name
