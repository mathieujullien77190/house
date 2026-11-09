import type { PointerEvent, ReactNode, RefObject } from 'react'

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
  /** Frise verticale (téléphone) : l'instant le plus récent en haut ; les positions restent en % du plus ancien (0) au plus récent (100). Horizontale par défaut. */
  vertical?: boolean
  /** La frise remplit la hauteur de son parent au lieu d'avoir une hauteur fixe (écran du téléphone, avec `vertical`). */
  fill?: boolean
  /** Des commandes en plus, posées à côté des raccourcis de fenêtre (le défilement des images). */
  extra?: ReactNode
  ranges: TimelineRange<T>[]
  /** Le raccourci qui correspond à la fenêtre courante, ou vide. */
  range: T | ''
  /** Vrai quand la fenêtre suit l'heure courante (le futur reste à droite de « maintenant »). */
  live: boolean
  ticks: TimelineTick[]
  markers: TimelineMarker[]
  coverage: TimelineSegment[]
  /** Position de « maintenant » en %, ou null quand le futur n'est pas dans la fenêtre : ce qui est à droite est le futur, vide. */
  nowX?: number | null
  /** L'étendue de la vidéo de l'événement ouvert (le clip déborde de l'événement : marges et segments), en %, ou null. */
  clipSpan?: TimelineSegment | null
  /** Position du curseur en %, ou null. */
  cursorX: number | null
  /** L'axe, pour y brancher la molette (écouteur non passif, au parent). */
  axisRef?: RefObject<HTMLDivElement | null>
  onRange: (id: T) => void
  onNow: () => void
  /** Clic dans un bloc : son identifiant et la position du clic dans le bloc (0 à 1, sur la durée réelle). */
  onSelect: (id: string) => void
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void
}
