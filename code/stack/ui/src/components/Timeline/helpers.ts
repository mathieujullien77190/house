import { MARKER_CLASS, MARKER_IDLE_CLASS, MARKER_ONGOING_CLASS, MARKER_SELECTED_CLASS, MARKER_VERTICAL_CLASS } from './constants'
import type { TimelineMarker } from './types'

export const markerClass = (marker: TimelineMarker, vertical = false): string =>
  `${vertical ? MARKER_VERTICAL_CLASS : MARKER_CLASS} ${marker.ongoing ? MARKER_ONGOING_CLASS : marker.selected ? MARKER_SELECTED_CLASS : MARKER_IDLE_CLASS}`

/**
 * Où poser un point de l'axe (position `x` en %, du plus ancien au plus récent) : à gauche sur l'axe horizontal ;
 * depuis le haut sur l'axe vertical, où le plus récent est en haut.
 */
export const pointStyle = (x: number, vertical: boolean) => (vertical ? { top: `${100 - x}%` } : { left: `${x}%` })

/** Où poser une plage de l'axe (début `x` et largeur `width`, en %) : même règle que `pointStyle`. */
export const spanStyle = (x: number, width: number, vertical: boolean) =>
  vertical ? { top: `${100 - x - width}%`, height: `${width}%` } : { left: `${x}%`, width: `${width}%` }
