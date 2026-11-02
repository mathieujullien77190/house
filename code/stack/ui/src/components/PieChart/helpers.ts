import { HIT_LENGTH, MIN_LENGTH, RADIUS, SIZE } from './constants'
import type { PieSlice } from './types'

export interface Arc {
  id: string
  /** Le tracé de la part : un arc de cercle, de son début à sa fin. */
  path: string
  /** La zone de survol, plus large que l'arc quand il est très court (sinon la même). */
  hitPath: string
}

const CENTER = SIZE / 2
const FULL_TURN = 2 * Math.PI

/**
 * Les longueurs des parts sur le cercle. Une part non vide trop petite est portée au minimum visible ; ce qu'elle
 * prend en plus est retiré à la plus grande, pour que le total reste le tour complet.
 */
export const arcLengths = (values: number[], circumference: number): number[] => {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (total <= 0) return values.map(() => 0)
  const lengths = values.map((value) => (Math.max(0, value) / total) * circumference)
  const raised = lengths.map((length) => (length > 0 ? Math.max(length, MIN_LENGTH) : 0))
  const excess = raised.reduce((sum, length) => sum + length, 0) - circumference
  if (excess > 0) {
    const biggest = raised.indexOf(Math.max(...raised))
    raised[biggest] -= excess
  }
  return raised
}

const point = (angle: number): string => `${(CENTER + RADIUS * Math.cos(angle)).toFixed(3)} ${(CENTER + RADIUS * Math.sin(angle)).toFixed(3)}`

/**
 * Un arc de cercle entre deux distances le long du cercle (un vrai arc SVG, pas un tracé en tirets : un tiret
 * dépend de la longueur exacte du cercle que le navigateur mesure, et déborde ou laisse un vide au moindre écart).
 */
export const arcPath = (from: number, to: number, circumference: number): string => {
  const start = (from / circumference) * FULL_TURN
  const end = (to / circumference) * FULL_TURN
  if (end - start >= FULL_TURN - 1e-6) {
    return `M${point(start)} A${RADIUS} ${RADIUS} 0 1 1 ${point(start + Math.PI)} A${RADIUS} ${RADIUS} 0 1 1 ${point(start)}`
  }
  const large = end - start > Math.PI ? 1 : 0
  return `M${point(start)} A${RADIUS} ${RADIUS} 0 ${large} 1 ${point(end)}`
}

/** Les arcs du cercle, un par part non vide, bout à bout depuis le haut (le dessin est tourné d'un quart de tour). */
export const buildArcs = (slices: PieSlice[]): Arc[] => {
  const circumference = FULL_TURN * RADIUS
  const lengths = arcLengths(slices.map((slice) => slice.value), circumference)
  let start = 0
  const arcs: Arc[] = []
  slices.forEach((slice, index) => {
    const length = lengths[index]
    if (length <= 0) return
    const hit = Math.max(length, HIT_LENGTH)
    const hitStart = start - (hit - length) / 2
    arcs.push({
      id: slice.id,
      path: arcPath(start, start + length, circumference),
      hitPath: arcPath(hitStart, hitStart + hit, circumference),
    })
    start += length
  })
  return arcs
}
