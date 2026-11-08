import type { MediaGesture } from '../CameraCard/types'

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

/** Un arbre posé dans le jardin : un rond vert déplaçable, en unités du plan. */
export interface PlanTree {
  id: string
  x: number
  y: number
  /** Le rayon du rond. */
  r: number
}

/** Un portail ou un portillon : un segment sur le contour du terrain. */
export interface PlanGate {
  id: string
  name: string
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Une caméra posée sur le plan et son champ de vision, un croissant (une portion de couronne) devant elle. */
export interface PlanCamera {
  id: string
  name: string
  x: number
  y: number
  /** Où elle regarde, en degrés depuis le haut du plan, dans le sens des aiguilles d'une montre : 0 = tout droit en haut, 180 = tout droit en bas. */
  angle: number
  /** L'ouverture du champ, en degrés. */
  fov: number
  /** La caméra est éteinte : son icône a un contour rouge. */
  off?: boolean
  /** Le bord proche et le bord lointain du croissant, en unités du plan. */
  near: number
  far: number
}

/** Une prise connectée posée sur le plan, avec son état : allumée ou éteinte. */
export interface PlanPlug {
  id: string
  name: string
  x: number
  y: number
  on: boolean
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
  /**
   * L'écran du téléphone (sous 1024 px) : le plan seul, en plein écran et en paysage (tourné d'un quart de tour si l'écran reste
   * droit), sans la zone « À placer » ; les ampoules ne se déplacent pas, un toucher les allume ou les éteint.
   */
  screen?: boolean
  /** Un rectangle posé dans le jardin pour la cage à perruches (et son nom), ou rien. */
  cage?: PlanRect
  cageLabel?: string
  /** Une terrasse orange clair autour de la maison, de cette largeur en unités du plan. */
  terrace?: number
  /** Le côté nord de la terrasse (en haut) est du béton gris clair au lieu de la couleur de la terrasse. */
  concreteNorth?: boolean
  /** L'arbre sélectionné (contour accentué) et l'appel quand on en touche un. */
  selectedTreeId?: string
  onSelectTree?: (id: string) => void
  /** Des chemins de béton gris clair (des chemins SVG), posés sur le terrain et sous le pavage et le toit : le bout peut suivre un arc. */
  paths?: string[]
  /** Le rayon des ampoules, en unités du plan (5 par défaut) : plus gros pour qu'elles se voient sur un grand plan. */
  lampRadius?: number
  /** Des prises connectées et leur état (un carré vert allumée, rouge éteinte). */
  plugs?: PlanPlug[]
  /** Une prise est glissée : sa nouvelle position, bornée à la zone dessinée. */
  onMovePlug?: (id: string, x: number, y: number) => void
  /** Des caméras et leur champ de vision. */
  cameras?: PlanCamera[]
  /** La caméra dont on voit le champ de vision (les autres n'ont que leur icône) et l'appel quand on touche une icône. */
  selectedCameraId?: string
  onSelectCamera?: (id: string) => void // id vide : un clic à côté, tout est désélectionné
  /** Une caméra est glissée : sa nouvelle position, bornée à la zone dessinée. */
  /**
   * Une caméra est réglée par sa poignée (posée devant l'icône) : la glisser tourne la caméra vers le pointeur (angle, 0 = tout droit en haut,
   * sens des aiguilles d'une montre) ; l'éloigner allonge la vue (far) et l'écarte (fov), la rapprocher la raccourcit et la resserre.
   */
  onAdjustCamera?: (id: string, setting: { angle: number; far: number; fov: number }) => void
  onMoveCamera?: (id: string, x: number, y: number) => void
  /** Des haies : des chemins SVG tracés en un gros trait vert arrondi (une « saucisse »), par exemple le long de la limite du terrain. */
  hedges?: string[]
  /** Des portails et portillons posés sur le contour du terrain : un trait épais entre deux points, avec son nom. */
  gates?: PlanGate[]
  /** La maison (avec sa terrasse) est décalée vers la droite de ce nombre d'unités du plan. */
  houseShift?: number
  /** Des zones de sol carrelé (même couleur que la terrasse), en unités du plan. */
  floors?: PlanRect[]
  /** Des zones de sol en chemins SVG (pour un bord en arc), réunies aux autres dans le même tracé de pavage ; même sens que les rectangles (horaire). */
  floorPaths?: string[]
  /** Un rectangle collé à la maison (une avancée), en unités du plan de la maison, du même toit gris. */
  extension?: PlanRect
  /** La maison est dessinée comme un toit gris plein (sans pièces ni cloisons à fournir). */
  roof?: boolean
  /** La zone dessinée (unités du plan) à la place de celle du jardin autour de la maison : un terrain plus large, la maison paraît plus petite. */
  view?: { x: number; y: number; w: number; h: number }
  /** Le contour SVG du terrain (par exemple en arc du côté de la rue) à la place du rectangle du jardin. */
  gardenOutline?: string
  /** Des arbres posés dans le jardin, et l'appel quand on en déplace un (sa nouvelle position, bornée au plan). */
  trees?: PlanTree[]
  onMoveTree?: (id: string, x: number, y: number) => void
  /** Le plan seul, sans la zone « À placer » (pour montrer la maison sans lampes), mais dans la mise en page de bureau. */
  bare?: boolean
  /** Le zoom au doigt de l'écran du téléphone : les gestes de la zone et le style du dessin. */
  gesture?: MediaGesture
  /** Le bouton retour (une flèche, en haut à gauche de l'écran du téléphone). */
  onBack?: () => void
  backLabel?: string
}
