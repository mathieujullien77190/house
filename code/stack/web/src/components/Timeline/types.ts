import type { ReactNode } from 'react'
import type { EventRow } from '@/types'

export type RangeId = '10m' | '1h' | '6h' | '24h'

export interface TimelineProps {
  apiKey: string
  camera: string
  /** Les événements d'une caméra, du plus récent au plus ancien. */
  events: EventRow[]
  /** L'instant choisi sur l'axe (image à montrer), ou null pour revenir au direct. */
  onCursor: (time: number | null) => void
  /** L'événement choisi (clip à montrer à la place de l'image) et le début de sa vidéo ; null quand on le ferme. */
  onEvent: (event: EventRow | null, at: number | null) => void
  /** Les instants (secondes absolues) où commence et finit la vidéo de l'événement ouvert, quand on les connaît ; null sinon. */
  clipRange: { start: number; end: number } | null
  /** Position de lecture du clip ouvert (secondes absolues) : le curseur la suit ; null sinon. */
  playhead: number | null
  /** L'identifiant de l'événement ouvert par la carte ; vide quand elle le ferme (la frise en retire alors sa sélection). */
  selectedEventId?: string
  /** La frise remplit la hauteur de son parent (écran du téléphone) au lieu d'avoir une hauteur fixe. */
  fill?: boolean
  /** La vitesse du curseur, en secondes de frise par seconde réelle : 1 (par défaut) temps réel, 60 une minute par seconde ; négatif : il recule. */
  rate?: number
  /** L'instant où la frise s'ouvre (l'image de la même seconde, depuis une autre caméra) ; sans lui, le direct. */
  initialCursor?: number
  /** Des commandes posées à côté des raccourcis de fenêtre (le défilement des images). */
  controls?: ReactNode
}

/** Un événement posé sur l'axe (le bloc de @house/ui, plus l'événement qu'il représente). */
export interface Marker {
  event: EventRow
  x: number
  width: number
  text: string
  selected: boolean
  ongoing: boolean
}
