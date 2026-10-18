import { FLOOR_LABEL } from '@/linkInfo'
import type { DiagramNode } from '@/nodes'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Room {
  name: string
  /** Rectangles qui forment la pièce (plusieurs pour une pièce en L). */
  rects: Rect[]
  /** Contour SVG quand la pièce n'est pas un simple rectangle. */
  outline?: string
}

const room = (name: string, rect: Rect): Room => ({ name, rects: [rect] })

export const GARDEN: Rect = { x: 0, y: 0, w: 900, h: 530 }
export const HOUSE: Rect = { x: 180, y: 100, w: 540, h: 300 }

/** Escalier en haut à droite, qui descend au sous-sol. */
export const STAIRS: Rect = { x: 600, y: 100, w: 120, h: 140 }

/**
 * Rez-de-chaussée vu de dessus :
 * - au nord : chambre 1, salle de bain (étroite), cuisine, escalier ;
 * - au milieu : couloir à gauche, entrée à droite (sous l'escalier) ;
 * - au sud : chambre 2, et le salon en L qui monte jusqu'à la cuisine, sans couloir entre les deux.
 * Le mur gauche du salon est dans le prolongement du mur droit de la salle de bain (x = 390).
 */
export const GROUND_ROOMS: Room[] = [
  room('Chambre 1', { x: 180, y: 100, w: 150, h: 140 }),
  room('SdB', { x: 330, y: 100, w: 60, h: 140 }),
  room('Cuisine', { x: 390, y: 100, w: 210, h: 140 }),
  room('Escalier ↓ sous-sol', STAIRS),
  room('Couloir', { x: 180, y: 240, w: 210, h: 50 }),
  room('Entrée', { x: 600, y: 240, w: 120, h: 50 }),
  room('Chambre 2', { x: 180, y: 290, w: 210, h: 110 }),
  {
    name: 'Salon',
    rects: [
      { x: 390, y: 240, w: 210, h: 160 },
      { x: 600, y: 290, w: 120, h: 110 },
    ],
    outline: 'M 390 240 H 600 V 290 H 720 V 400 H 390 Z',
  },
]

/** Sous-sol sous la maison : local technique, avec l'arrivée de l'escalier au même endroit. */
export const BASEMENT_ROOMS: Room[] = [
  room('Local technique', { x: 180, y: 100, w: 420, h: 300 }),
  room('Escalier ↑ rez-de-chaussée', STAIRS),
]

/** Le portail est à l'ouest : un chemin le relie à la porte, au bout ouest du couloir. */
export const DOOR = { x: 180, y1: 252, y2: 278 }
export const PATH: Rect = { x: 0, y: 250, w: 180, h: 30 }
export const GATE = { x: 0, leaf1: [238, 262], leaf2: [268, 292] }

/** Le nichoir : un simple carré qui contient les 2 mini-caméras. */
export const NICHOIR: Rect = { x: 740, y: 50, w: 150, h: 140 }

const contains = (r: Rect, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

/** Nom de la pièce sans les flèches d'étage. */
const plainName = (name: string): string => name.replace(/\s*[↓↑].*$/, '')

/** Où se trouve un composant : pièce, nichoir ou jardin (rez-de-chaussée) ; local technique (sous-sol). */
export const locate = (n: DiagramNode): string => {
  const cx = n.x + n.w / 2
  const cy = n.y + n.h / 2
  const floor = FLOOR_LABEL[n.floor]
  if (n.floor === 'rdc') {
    if (contains(NICHOIR, cx, cy)) return `Nichoir · ${floor}`
    const found = GROUND_ROOMS.find((r) => r.rects.some((rect) => contains(rect, cx, cy)))
    return `${found ? plainName(found.name) : 'Jardin'} · ${floor}`
  }
  const found = BASEMENT_ROOMS.find((r) => r.rects.some((rect) => contains(rect, cx, cy)))
  return `${found ? plainName(found.name) : contains(HOUSE, cx, cy) ? 'Local technique' : 'Extérieur'} · ${floor}`
}
