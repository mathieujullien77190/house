/** Une ampoule posée sur le plan, en unités du plan (540 × 300, l'origine en haut à gauche de la maison). */
export interface PlanLamp {
  id: string
  name: string
  x: number
  y: number
  on: boolean
  /** La lampe répond au pont ; sinon l'ampoule est estompée. */
  reachable: boolean
}

/** Un rectangle du plan, en unités du plan. */
export interface PlanRect {
  x: number
  y: number
  w: number
  h: number
}

/** Un mur du plan : un segment, qui peut s'arrêter avant le mur d'en face pour laisser une ouverture. */
export interface PlanWall {
  x1: number
  y1: number
  x2: number
  y2: number
  /** Un claustra (une cloison ajourée) plutôt qu'un mur plein : tracé en pointillés. */
  screen?: boolean
}

/** Une pièce du plan : un ou plusieurs rectangles (une pièce en L en a deux) et, pour une pièce en L, son contour. */
export interface PlanRoom {
  name: string
  rects: PlanRect[]
  /** Le contour SVG d'une pièce qui n'est pas un simple rectangle. */
  outline?: string
}

export interface LightsPlanProps {
  /** Le nom de l'étage, lu par les lecteurs d'écran (il n'est pas écrit dans le plan) : « Rez-de-chaussée ». */
  title: string
  /** Les pièces dessinées dans le contour de la maison. */
  rooms: PlanRoom[]
  /** Les cloisons en plus du contour des pièces. */
  walls: PlanWall[]
  lamps: PlanLamp[]
  /** Une ampoule est glissée : sa nouvelle position, déjà bornée au plan. */
  onMove: (id: string, x: number, y: number) => void
  /** Un clic (sans glisser) sur une ampoule : allumer ou éteindre. */
  onToggle: (id: string) => void
}
