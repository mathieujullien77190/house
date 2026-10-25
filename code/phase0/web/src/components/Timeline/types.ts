import type { EventRow } from '@/types'

export type RangeId = '1h' | '6h' | '24h' | '7d'

export interface TimelineProps {
  apiKey: string
  /** Les événements d'une caméra, du plus récent au plus ancien. */
  events: EventRow[]
}

/** Une graduation de l'axe : position en % et libellé. */
export interface Tick {
  x: number
  label: string
}

/** Un événement posé sur l'axe : position et largeur en %, du plus ancien au plus récent. */
export interface Marker {
  event: EventRow
  x: number
  width: number
  text: string
  selected: boolean
}

export interface TimelineUIProps {
  apiKey: string
  ranges: { id: RangeId; label: string }[]
  range: RangeId
  ticks: Tick[]
  markers: Marker[]
  /** Nombre d'événements plus anciens que la fenêtre affichée. */
  older: number
  selected: EventRow | null
  onRange: (id: RangeId) => void
  onSelect: (id: string) => void
  onClose: () => void
}
