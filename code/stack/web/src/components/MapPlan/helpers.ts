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

/** Les crans de la luminosité d'une ampoule sur la carte : une image d'ampoule par couleur, donc pas une par valeur (1 à 254). */
const BRIGHTNESS_STEPS = 16

/**
 * La couleur d'une ampoule allumée **selon sa luminosité** : **seul le jaune (sa couleur) pâlit**, mêlé de blanc quand la luminosité baisse (au plancher, il reste un quart de la couleur) ;
 * le rond blanc et le contour noir de l'icône restent à pleine opacité. Inchangée si l'ampoule est éteinte, injoignable, sans luminosité ou d'une couleur qui n'est pas un `#rrggbb` / `#rgb`.
 */
export const bulbColor = (color: string, on: boolean, reachable: boolean, brightness: number | null | undefined): string => {
  if (!on || !reachable || brightness === null || brightness === undefined) return color
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1]
  if (!hex) return color
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
  const share = Math.min(1, Math.max(0, brightness / BRIGHTNESS_MAX))
  const level = BRIGHTNESS_FLOOR + (1 - BRIGHTNESS_FLOOR) * (Math.round(share * BRIGHTNESS_STEPS) / BRIGHTNESS_STEPS)
  const channel = (offset: number): string => {
    const value = Number.parseInt(full.slice(offset, offset + 2), 16)
    return Math.round(255 - (255 - value) * level)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(2)}${channel(4)}`
}

/** Le nom d'une ampoule avec sa luminosité en pourcentage quand elle est allumée (« Perruche · 60 % »). */
export const bulbLabel = (name: string, on: boolean, reachable: boolean, brightness: number | null | undefined): string =>
  on && reachable && brightness !== null && brightness !== undefined
    ? `${name} · ${Math.round((brightness / BRIGHTNESS_MAX) * 100)} %`
    : name

/** Une température écrite sur le plan : « 21° » ou « 21,5° » (une décimale au plus, à la française). */
export const temperatureText = (value: number): string => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}°`
