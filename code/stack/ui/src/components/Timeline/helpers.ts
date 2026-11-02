import { MARKER_CLASS, MARKER_IDLE_CLASS, MARKER_ONGOING_CLASS, MARKER_SELECTED_CLASS } from './constants'
import type { TimelineMarker } from './types'

export const markerClass = (marker: TimelineMarker): string =>
  `${MARKER_CLASS} ${marker.ongoing ? MARKER_ONGOING_CLASS : marker.selected ? MARKER_SELECTED_CLASS : MARKER_IDLE_CLASS}`
