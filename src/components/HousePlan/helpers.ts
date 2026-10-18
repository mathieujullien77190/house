import type { Floor } from '@/nodes'
import { BASEMENT_ROOMS, GROUND_ROOMS, STAIRS, STEP_COUNT } from './constants'
import type { Rect, Room } from './types'

export const roomsFor = (floor: Floor): Room[] => (floor === 'rdc' ? GROUND_ROOMS : BASEMENT_ROOMS)

/** Ordonnées des traits qui figurent les marches de l'escalier. */
export const stairSteps = (): number[] => {
  const gap = STAIRS.h / (STEP_COUNT + 1)
  return Array.from({ length: STEP_COUNT }, (_, i) => STAIRS.y + gap * (i + 1))
}

/** Attributs SVG (`width`/`height`) d'un rectangle décrit par `w`/`h`. */
export const toBox = (r: Rect) => ({ x: r.x, y: r.y, width: r.w, height: r.h })
