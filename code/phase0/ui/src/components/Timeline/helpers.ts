import { MARKER_CLASS, MARKER_IDLE_CLASS, MARKER_ONGOING_CLASS, MARKER_SELECTED_CLASS } from './constants'
import type { TimelineMarker } from './types'

export const markerClass = (marker: TimelineMarker): string =>
  `${MARKER_CLASS} ${marker.ongoing ? MARKER_ONGOING_CLASS : marker.selected ? MARKER_SELECTED_CLASS : MARKER_IDLE_CLASS}`

/** La position d'un clic dans un bloc, sur sa durée réelle (0 à 1), même quand le bloc est élargi. */
export const clickFraction = (clientX: number, rect: DOMRect, scale: number): number => {
  const raw = (clientX - rect.left) / (rect.width || 1)
  return Math.min(1, Math.max(0, raw * scale))
}
