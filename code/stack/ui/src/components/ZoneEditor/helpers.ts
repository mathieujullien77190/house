import { MAX_POINTS, MIN_POINTS } from './constants'
import type { ZonePoint } from './types'

/** Une part de l'image : entre 0 et 1. */
export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

/** Le milieu du côté qui part du sommet `index` vers le suivant. */
export const edgeMiddle = (points: ZonePoint[], index: number): ZonePoint => {
  const a = points[index]
  const b = points[(index + 1) % points.length]
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

/** Un sommet de plus, juste après `index`, à `point` ; rien de plus au-delà de 32 sommets. */
export const insertAfter = (points: ZonePoint[], index: number, point: ZonePoint): ZonePoint[] =>
  points.length >= MAX_POINTS ? points : [...points.slice(0, index + 1), point, ...points.slice(index + 1)]

/** Un sommet de moins ; un triangle garde ses trois sommets. */
export const removeAt = (points: ZonePoint[], index: number): ZonePoint[] =>
  points.length <= MIN_POINTS ? points : points.filter((_, i) => i !== index)

/** Le sommet `index` déplacé en `point`. */
export const moveTo = (points: ZonePoint[], index: number, point: ZonePoint): ZonePoint[] =>
  points.map((old, i) => (i === index ? point : old))

/**
 * La part de l'image sous le pointeur, dans le cadre `box` (bornée à l'image). Avec `quarterTurn`, le cadre est celui d'une image tournée d'un quart
 * de tour horaire : son x suit le bas de l'écran, son y suit la gauche.
 */
export const pointOf = (
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
  quarterTurn = false,
): ZonePoint =>
  quarterTurn
    ? [clamp01((clientY - box.top) / box.height), clamp01(1 - (clientX - box.left) / box.width)]
    : [clamp01((clientX - box.left) / box.width), clamp01((clientY - box.top) / box.height)]

/** Le tracé SVG (viewBox 0 à 100) de ce qui est hors du polygone : le cadre entier, creusé du polygone. */
export const outsidePath = (points: ZonePoint[]): string =>
  `M0 0H100V100H0Z M${points.map(([x, y]) => `${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`).join(' L')}Z`

/** Les sommets en points SVG (viewBox 0 à 100). */
export const outlinePoints = (points: ZonePoint[]): string =>
  points.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(' ')
