import type { PointerEvent } from 'react'
import type { EventRow } from '@/types'

export type RangeId = '10m' | '1h' | '6h' | '24h' | '7d'

export interface TimelineProps {
  apiKey: string
  camera: string
  /** Les événements d'une caméra, du plus récent au plus ancien. */
  events: EventRow[]
  /** L'instant choisi sur l'axe (image à montrer), ou null pour revenir au direct. */
  onCursor: (time: number | null) => void
  /** L'événement choisi (clip à montrer à la place de l'image) et l'instant cliqué dedans ; null quand on le ferme. */
  onEvent: (event: EventRow | null, at: number | null) => void
  /** Position de lecture du clip ouvert (secondes absolues) : le curseur la suit ; null sinon. */
  playhead: number | null
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
  /** Largeur dessinée, jamais sous la largeur minimale (pour rester cliquable). */
  width: number
  /** Rapport largeur dessinée / largeur réelle de l'événement : un clic se lit sur la durée réelle. */
  scale: number
  text: string
  selected: boolean
}

/** Une plage où House Sync a des images : position et largeur en %. */
export interface Segment {
  x: number
  width: number
}

export interface TimelineUIProps {
  ranges: { id: RangeId; label: string }[]
  /** Le raccourci qui correspond à la fenêtre courante, ou vide si la molette l'a changée. */
  range: RangeId | ''
  /** Vrai quand le bord droit suit l'heure courante. */
  live: boolean
  /** Libellé de la fenêtre affichée (du … au …, durée). */
  windowText: string
  ticks: Tick[]
  markers: Marker[]
  coverage: Segment[]
  /** Position du curseur en %, ou null. */
  cursorX: number | null
  /** Nombre d'événements plus anciens que la fenêtre affichée. */
  older: number
  /** L'axe, pour y brancher la molette (écouteur non passif). */
  axisRef: React.RefObject<HTMLDivElement | null>
  onRange: (id: RangeId | '') => void
  onEarlier: () => void
  onLater: () => void
  onNow: () => void
  /** Clic dans un bloc : l'événement et la position du clic dans le bloc (0 à 1). */
  onSelect: (id: string, fraction: number) => void
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void
}
