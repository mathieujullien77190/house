export type ViewId = 'hardware' | 'software'
export type BoxTone = 'plain' | 'warm' | 'green' | 'dashed'
export type PanelTone = 'panel' | 'warm'

export interface ArchBox {
  id: string
  x: number
  y: number
  w: number
  h: number
  tone: BoxTone
  title: string
  /** Lignes de description sous le titre. */
  lines: string[]
}

export interface ArchPanel {
  id: string
  x: number
  y: number
  w: number
  h: number
  tone: PanelTone
  title: string
  /** Titre aligné à droite du cadre, pour dégager le haut à gauche. */
  titleEnd?: boolean
}

export interface ArchArrow {
  id: string
  /** Tracé SVG (attribut `d`). */
  d: string
  /** Pointe aux deux extrémités. */
  both?: boolean
  dashed?: boolean
}

export interface ArchLabel {
  id: string
  x: number
  y: number
  text: string
  anchor?: 'start' | 'middle' | 'end'
  /** Petit texte gris (annotation) au lieu d'un libellé de flèche. */
  note?: boolean
}

/** Disque (cylindre) : `cx` centre, `cy` centre de l'ellipse du dessus ; le corps s'allonge avec les lignes. */
export interface ArchDisk {
  id: string
  cx: number
  cy: number
  title: string
  lines: string[]
  /** Demi-largeur, si le contenu est plus large que celle par défaut. */
  rx?: number
}

export interface ArchView {
  id: ViewId
  label: string
  /** Phrase qui explique la vue, affichée sous le titre. */
  intro: string
  /** Description pour les lecteurs d'écran. */
  ariaLabel: string
  viewBox: string
  panels: ArchPanel[]
  boxes: ArchBox[]
  arrows: ArchArrow[]
  labels: ArchLabel[]
  disks?: ArchDisk[]
}

export interface Phase0ArchitectureUIProps {
  view: ArchView
  options: { id: ViewId; label: string }[]
  onViewChange: (id: ViewId) => void
}
