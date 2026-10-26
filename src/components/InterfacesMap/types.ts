/** Rôle d'un bloc : sa couleur. app = les deux applications, ui = le paquet partagé, story = Storybook, api = House API, ext = hors du schéma. */
export type Role = 'app' | 'ui' | 'story' | 'api' | 'ext'

export interface Frame {
  id: string
  x: number
  y: number
  w: number
  h: number
  role: Role
  title: string
  sub: string
  /** Lignes d'annotation sous le sous-titre (x, y absolus). */
  notes?: { text: string; y: number }[]
}

export interface ChipGroup {
  label: string
  items: string[]
}

/** Une colonne de groupes de pastilles, posée dans un cadre ; `y` est la ligne de base de la première légende. */
export interface Column {
  frame: string
  x: number
  y: number
  maxW: number
  role: Role
  groups: ChipGroup[]
  /** Petite phrase sous le dernier groupe. */
  note?: string
}

export interface PlacedLabel {
  id: string
  x: number
  y: number
  text: string
  kind: 'group' | 'note'
}

export interface PlacedChip {
  id: string
  x: number
  y: number
  w: number
  h: number
  text: string
  role: Role
}

export interface Layout {
  labels: PlacedLabel[]
  chips: PlacedChip[]
}

/** Bloc à plusieurs lignes (la chaîne des couches de House API). */
export interface TextBox {
  id: string
  x: number
  y: number
  w: number
  h: number
  role: Role
  title: string
  lines: string[]
  dashed?: boolean
}

export interface MapArrow {
  id: string
  d: string
  dashed?: boolean
}

export interface MapLabel {
  id: string
  x: number
  y: number
  text: string
  anchor?: 'start' | 'middle' | 'end'
  /** Rotation en degrés autour du point (x, y), pour les libellés verticaux. */
  rotate?: number
}

export interface InterfacesMapUIProps {
  layout: Layout
}
