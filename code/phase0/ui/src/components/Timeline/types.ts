import type { PointerEvent, RefObject } from 'react'

/** Une graduation de l'axe : position en % et libellé. */
export interface TimelineTick {
  x: number
  label: string
}

/** Un bloc sur l'axe : position et largeur en %. */
export interface TimelineMarker {
  id: string
  x: number
  /** Largeur dessinée, jamais sous la largeur minimale (pour rester cliquable). */
  width: number
  /** Rapport largeur dessinée / largeur réelle : un clic se lit sur la durée réelle. */
  scale: number
  /** Libellé (infobulle et lecteur d'écran). */
  text: string
  selected: boolean
  /** Vrai tant que l'événement n'est pas terminé : hachures jusqu'au bord droit. */
  ongoing: boolean
}

/** Une plage couverte (des images existent) : position et largeur en %. */
export interface TimelineSegment {
  x: number
  width: number
}

export interface TimelineRange<T extends string> {
  id: T
  label: string
}

export interface TimelineProps<T extends string> {
  ranges: TimelineRange<T>[]
  /** Le raccourci qui correspond à la fenêtre courante, ou vide. */
  range: T | ''
  /** Vrai quand la fenêtre suit l'heure courante (le futur reste à droite de « maintenant »). */
  live: boolean
  /** Libellé de la fenêtre affichée (du … au …, durée). */
  windowText: string
  ticks: TimelineTick[]
  markers: TimelineMarker[]
  coverage: TimelineSegment[]
  /** Position de « maintenant » en %, ou null quand le futur n'est pas dans la fenêtre : ce qui est à droite est le futur, vide. */
  nowX?: number | null
  /** L'étendue de la vidéo de l'événement ouvert (le clip déborde de l'événement : marges et segments), en %, ou null. */
  clipSpan?: TimelineSegment | null
  /** Position du curseur en %, ou null. */
  cursorX: number | null
  /** Nombre d'événements plus anciens que la fenêtre affichée. */
  older: number
  /** L'axe, pour y brancher la molette (écouteur non passif, au parent). */
  axisRef?: RefObject<HTMLDivElement | null>
  onRange: (id: T) => void
  onNow: () => void
  /** Clic dans un bloc : son identifiant et la position du clic dans le bloc (0 à 1, sur la durée réelle). */
  onSelect: (id: string, fraction: number) => void
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void
}
