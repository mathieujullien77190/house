import type { Vec3 } from '@/components/ShutterWiring3D/types'
import { PITCH } from '@/lib/esp32Board'
import type { BreadboardPart } from './types'

export {
  BUTTONS_CLASS,
  HINT,
  HOST_CLASS,
  NAMES_LABEL,
  NO_WEBGL_TEXT,
  RESET_LABEL,
  TOP_LABEL,
  VIEW_HEIGHT,
  WIRES_LABEL,
} from '@/components/ShutterWiring3D/constants'

export const TITLE = 'L’émetteur infrarouge sur plaque d’essai, trou par trou'
export const INTRO =
  'Le montage de la clim sans soudure : chaque pièce est à sa place exacte, avec ses pattes nommées. Les lettres a à e et les numéros des colonnes sont ceux de la plaque : une pièce « en d5 » a sa patte dans le trou de la rangée d, colonne 5. Dimensions approximatives.'
export const ARIA_LABEL = 'Schéma 3D d’une plaque d’essai avec un transistor, deux résistances et une LED infrarouge reliés à une carte ESP32 : glisser pour tourner, molette pour zoomer'
export const PARTS_TITLE = 'Les pièces'
export const STEPS_TITLE = 'Les étapes'
export const WARNING =
  'Dans une même colonne (le même numéro), les 5 trous a à e sont reliés entre eux : deux pattes dans la même colonne sont donc reliées. Les rangées f à j sont l’autre moitié, séparée par la gorge du milieu : on ne s’en sert pas ici.'
export const TEST_TEXT = 'Test : envoie un ordre de clim depuis la page et regarde la LED avec la caméra de ton téléphone. La lumière infrarouge, invisible à l’œil, y apparaît en violet. Si rien ne s’allume, retourne le transistor (C et E inversés) : c’est sans danger.'

export const PARTS: BreadboardPart[] = [
  { id: 'transistor', name: 'Transistor BC337', note: '3 pattes. Face plate (celle avec les lettres) vers toi : C (collecteur), B (base), E (émetteur), de gauche à droite. Un 2N2222 est E, B, C : à l’envers.' },
  { id: 'r330', name: 'Résistance', value: '330 Ω', bands: ['#f08a24', '#f08a24', '#111111', '#111111', '#7a4a2a'], note: 'Orange, orange, noir, noir, marron. Sachet « 330 » du kit.' },
  { id: 'r47', name: 'Résistance', value: '47 Ω', bands: ['#f2d24b', '#8b5cf6', '#111111', '#d4af37', '#7a4a2a'], note: 'Jaune, violet, noir, or, marron. Sachet « 47 » du kit.' },
  { id: 'led', name: 'LED infrarouge 940 nm', note: 'Transparente, 5 mm. Patte longue = plus (+), patte courte (côté plat de la collerette) = moins (−).' },
]

export const STEPS = [
  'Pose la plaque de 400 points devant toi, les chiffres en haut, les lettres a à e du côté des deux lignes rouge et bleue, en bas.',
  'Transistor : face plate vers toi, ses 3 pattes en e10, e11 et e12. De gauche à droite : C (collecteur) en e10, B (base) en e11, E (émetteur) en e12.',
  'Résistance 330 Ω : une patte en d5, l’autre en d11. Elle relie le fil G26 à la base du transistor (e11).',
  'LED infrarouge : patte courte en c10 (la même colonne que le collecteur), patte longue en c16.',
  'Résistance 47 Ω : une patte en b16 (la même colonne que la patte longue de la LED), l’autre en b22.',
  'Fil noir court (mâle-mâle) : de a12 (l’émetteur) à la ligne bleue (GND). Fil rouge court : de a22 à la ligne rouge (5V).',
  'Câbles Dupont femelle-mâle vers l’ESP32 : la femelle sur la broche de l’ESP32, le mâle sur la plaque. G26 vers a5, GND vers la ligne bleue, 5V vers la ligne rouge.',
]

// Géométrie, en millimètres : la plaque de 400 points (30 colonnes) est à gauche de l'ESP32 (à l'origine, comme dans les autres vues).
export const BREADBOARD = { x: -82, width: 82, depth: 55, height: 8.5 }
export const TOP = BREADBOARD.height
/** x du trou de cette colonne (1 à 30). */
export const holeX = (column: number): number => BREADBOARD.x - BREADBOARD.width / 2 + 5.3 + (column - 1) * PITCH
/** z de chaque rangée du demi-plateau du bas (a est la plus proche de l'utilisateur) et des lignes d'alimentation. */
export const ROW_Z = { a: 13.97, b: 11.43, c: 8.89, d: 6.35, e: 3.81 } as const
export type Row = keyof typeof ROW_Z
export const RAIL_Z = { gnd: 19.8, plus: 22.4 } as const

export const COLORS = {
  board: 0xf1f1ec,
  hole: 0x2a2f36,
  railPlus: 0xe5534b,
  railMinus: 0x3b82f6,
  resistor: 0x8fc7e8,
  lead: 0xc7ccd1,
  transistor: 0x1b1b1b,
  transistorFace: 0x4a4f57,
  led: 0xcfd8e8,
  wireBlack: 0x2a2a2a,
  wireRed: 0xe5534b,
  g26: 0xe879a9,
  gnd: 0x7d8791,
  v5: 0xff7043,
  label: '#1b2230',
  labelMuted: '#6b7684',
} as const

/** Les bagues de couleur des deux résistances (5 bagues : trois chiffres, multiplicateur, tolérance), valeurs three.js. */
export const BANDS_330 = [0xf08a24, 0xf08a24, 0x111111, 0x111111, 0x7a4a2a]
export const BANDS_47 = [0xf2d24b, 0x8b5cf6, 0x111111, 0xd4af37, 0x7a4a2a]

/** Point de vue de départ, du dessus, et point regardé. */
export const TARGET: Vec3 = { x: -52, y: 6, z: 4 }
export const START: Vec3 = { x: -60, y: 118, z: 112 }
export const TOP_VIEW: Vec3 = { x: -52, y: 210, z: 8 }
