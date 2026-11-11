import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { BRIGHTNESS_FLOOR, BRIGHTNESS_MAX, MAP_HOUSE_HEIGHT } from './constants'
import { HEATPUMP_IMAGE, ROUTER_IMAGE } from './icons'
import type { Point } from './projection'

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

/** L'identifiant, dans les éléments du plan gardé, du coin `index` du contour des carreaux. */
export const tilesCornerId = (index: number): string => `tiles-corner-${index}`
/** L'identifiant du coin `index` du contour du chemin du garage. */
export const garageCornerId = (index: number): string => `garage-corner-${index}`

/** Un contour gardé dans les éléments du plan (ses coins, de `<préfixe>0` à `<préfixe><n>`) ; null tant qu'il n'a pas été touché. */
const ringFrom = (items: Record<string, { x: number; y: number }>, id: (index: number) => string): Point[] | null => {
  const ring: Point[] = []
  for (let saved = items[id(0)]; saved; saved = items[id(ring.length)]) ring.push([saved.x, saved.y])
  return ring.length >= 3 ? ring : null
}

/** Le contour des carreaux modifié à la main ; null tant que l'utilisateur ne l'a pas touché. */
export const tilesRingFrom = (items: Record<string, { x: number; y: number }>): Point[] | null => ringFrom(items, tilesCornerId)

/** Le contour du chemin du garage modifié à la main ; null tant que l'utilisateur ne l'a pas touché. */
export const garageRingFrom = (items: Record<string, { x: number; y: number }>): Point[] | null => ringFrom(items, garageCornerId)

/** En deçà de cet écart (unités du plan, environ 14 cm), un coin se cale sur l'alignement de ses voisins. */
export const SNAP_DISTANCE = 6

/**
 * Le coin `index` du contour déplacé en `point`, **calé sur les lignes droites** : si son x (ou son y) est à moins de `SNAP_DISTANCE` de celui d'un de ses deux voisins, il prend le
 * leur, et le côté devient exactement vertical (ou horizontal). Le plan est droit à l'écran : un côté vertical ou horizontal du plan est droit sur la carte.
 */
export const snapCorner = (point: Point, ring: Point[], index: number): Point => {
  const neighbors = [ring[(index + ring.length - 1) % ring.length], ring[(index + 1) % ring.length]]
  const nearest = (value: number, axis: 0 | 1): number =>
    neighbors
      .map((neighbor) => neighbor[axis])
      .reduce((best, candidate) => (Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best), Number.POSITIVE_INFINITY)
  const x = nearest(point[0], 0)
  const y = nearest(point[1], 1)
  return [Math.abs(x - point[0]) <= SNAP_DISTANCE ? x : point[0], Math.abs(y - point[1]) <= SNAP_DISTANCE ? y : point[1]]
}

/** L'identifiant, dans les éléments du plan gardé, d'une icône seule (la pompe à chaleur). */
export const decorItemId = (id: string): string => `decor-${id}`

/** Les icônes seules du plan et leur place de départ (au nord de la maison, à déplacer à la main). */
export const DEFAULT_DECORS: { id: string; x: number; y: number; image: string }[] = [
  { id: 'pac', x: 270, y: -100, image: HEATPUMP_IMAGE },
  { id: 'box', x: 330, y: -100, image: ROUTER_IMAGE },
]

/** Les lignes (x et y) sur lesquelles un coin se cale : en deçà de `SNAP_DISTANCE`, il prend la valeur de la ligne la plus proche. */
export const snapToLines = (point: Point, xs: number[], ys: number[]): Point => {
  const nearest = (value: number, lines: number[]): number =>
    lines.reduce((best, candidate) => (Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best), Number.POSITIVE_INFINITY)
  const x = nearest(point[0], xs)
  const y = nearest(point[1], ys)
  return [Math.abs(x - point[0]) <= SNAP_DISTANCE ? x : point[0], Math.abs(y - point[1]) <= SNAP_DISTANCE ? y : point[1]]
}

/** L'identifiant, dans les éléments du plan gardé, d'un coin (`a` : x1, y1 ; `b` : x2, y2) du rectangle `rect` de la pièce `room`. */
export const roomCornerId = (room: number, rect: number, corner: 'a' | 'b'): string => `room-${room}-${rect}-${corner}`

/** Les rectangles des pièces modifiés à la main (les murs de la maison), lus dans les éléments du plan ; null si l'un manque (ils n'ont pas été touchés, ou la forme des pièces a changé). */
export const roomRectsFrom = (
  items: Record<string, { x: number; y: number }>,
  shape: number[],
): { x1: number; y1: number; x2: number; y2: number }[][] | null => {
  const rooms = shape.map((count, room) =>
    Array.from({ length: count }, (_, rect) => {
      const a = items[roomCornerId(room, rect, 'a')]
      const b = items[roomCornerId(room, rect, 'b')]
      return a && b ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y } : null
    }),
  )
  return rooms.every((room) => room.every((rect) => rect !== null)) && rooms.length > 0
    ? (rooms as { x1: number; y1: number; x2: number; y2: number }[][])
    : null
}

/** Les éléments du plan à écrire pour des rectangles de pièces (deux coins par rectangle). */
export const roomItems = (rooms: { x1: number; y1: number; x2: number; y2: number }[][]): Record<string, { x: number; y: number }> =>
  Object.fromEntries(
    rooms.flatMap((room, roomIndex) =>
      room.flatMap((rect, rectIndex) => [
        [roomCornerId(roomIndex, rectIndex, 'a'), { x: rect.x1, y: rect.y1 }],
        [roomCornerId(roomIndex, rectIndex, 'b'), { x: rect.x2, y: rect.y2 }],
      ]),
    ),
  )
