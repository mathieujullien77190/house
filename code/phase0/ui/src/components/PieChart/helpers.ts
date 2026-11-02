import { HIT_LENGTH, MIN_LENGTH, RADIUS } from './constants'
import type { PieSlice } from './types'

export interface Arc {
  id: string
  /** La longueur tracée puis le vide, pour `stroke-dasharray`. */
  dashArray: string
  /** Le décalage de départ, pour `stroke-dashoffset`. */
  dashOffset: number
  /** La zone de survol, plus large que l'arc quand il est très court (sinon la même). */
  hitDashArray: string
  hitDashOffset: number
}

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

/** Les arcs du cercle, un par part non vide, bout à bout depuis le haut. */
export const buildArcs = (slices: PieSlice[]): Arc[] => {
  const circumference = 2 * Math.PI * RADIUS
  const lengths = arcLengths(slices.map((slice) => slice.value), circumference)
  let start = 0
  const arcs: Arc[] = []
  slices.forEach((slice, index) => {
    const length = lengths[index]
    if (length <= 0) return
    const hit = Math.max(length, HIT_LENGTH)
    arcs.push({
      id: slice.id,
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -start,
      hitDashArray: `${hit} ${circumference - hit}`,
      hitDashOffset: -(start - (hit - length) / 2),
    })
    start += length
  })
  return arcs
}
