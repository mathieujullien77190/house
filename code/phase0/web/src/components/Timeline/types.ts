import type { EventRow } from '@/types'

export type RangeId = '10m' | '1h' | '6h' | '24h'

export interface TimelineProps {
  apiKey: string
  camera: string
  /** Les événements d'une caméra, du plus récent au plus ancien. */
  events: EventRow[]
  /** L'instant choisi sur l'axe (image à montrer), ou null pour revenir au direct. */
  onCursor: (time: number | null) => void
  /** L'événement choisi (clip à montrer à la place de l'image) et l'instant cliqué dedans ; null quand on le ferme. */
  onEvent: (event: EventRow | null, at: number | null) => void
  /** Les instants (secondes absolues) où commence et finit la vidéo de l'événement ouvert, quand on les connaît ; null sinon. */
  clipRange: { start: number; end: number } | null
  /** Position de lecture du clip ouvert (secondes absolues) : le curseur la suit ; null sinon. */
  playhead: number | null
}

/** Un événement posé sur l'axe (le bloc de @house/ui, plus l'événement qu'il représente). */
export interface Marker {
  event: EventRow
  x: number
  width: number
  scale: number
  text: string
  selected: boolean
  ongoing: boolean
}
