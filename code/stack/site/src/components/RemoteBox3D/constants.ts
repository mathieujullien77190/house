import type { Side } from '@/lib/esp32Board'
import type { Vec3 } from '@/components/ShutterWiring3D/types'

// Dimensions en millimètres (1 unité three.js = 1 mm). L'ESP32 est à plat à l'origine, USB-C vers +z (vers le spectateur),
// le module radio CC1101 à sa droite (comme pour les volets) et la petite plaque de l'émetteur infrarouge à sa gauche.
export {
  BUTTONS_CLASS,
  HINT,
  HOST_CLASS,
  NAMES_LABEL,
  NO_WEBGL_TEXT,
  POWER_LABEL,
  POWER_TITLE,
  RESET_LABEL,
  TOP_LABEL,
  VIEW_HEIGHT,
  WIRES_LABEL,
} from '@/components/ShutterWiring3D/constants'

export const TITLE = 'Schéma 3D du boîtier volet + clim'
export const INTRO =
  'Une seule carte ESP32 : le module radio CC1101 (volets Somfy RTS, 8 fils) et, à gauche, la petite plaque verte de l’émetteur infrarouge (pompe à chaleur Mitsubishi sans Wi-Fi, 3 fils). Chaque pièce est reliée par une piste colorée ; le même montage, trou par trou sur plaque d’essai sans soudure, est dans la vue en dessous. Dimensions approximatives.'
export const ARIA_LABEL = 'Schéma 3D d’une carte ESP32 avec un module radio CC1101 et un émetteur infrarouge : glisser pour tourner, molette pour zoomer'
export const WIRES_TITLE = 'Les 11 fils'
export const POWER_STEPS = [
  'Prise murale 230 V, puis un chargeur USB 5 V : n’importe quel chargeur de téléphone, 1 A suffit.',
  'Câble USB-C de données, du chargeur à l’ESP32 (5 V).',
  'L’ESP32 donne le 3,3 V au CC1101 (fil rouge VCC) et le 5 V à l’émetteur infrarouge (broche 5V), qui a besoin de plus de courant.',
]
export const WARNING =
  '3V3 pour le CC1101, jamais 5 V : il grille. L’émetteur infrarouge, lui, prend le 5V : une LED infrarouge directement sur une broche de l’ESP32 porte à peine à un mètre, le transistor lui donne tout le courant.'
export const NOTE =
  'Émetteur infrarouge : un transistor NPN (2N2222 ou équivalent) commandé par G26 à travers 330 Ω ; la LED infrarouge 940 nm est en série avec 47 Ω entre le 5V et le collecteur (environ 75 mA, par à-coups très courts). Un module « émetteur IR » tout fait (transistor intégré) donne le même résultat. Un récepteur infrarouge VS1838B (3V3, GND, G27), facultatif, sert à lire la télécommande de la clim pour confirmer son protocole.'

export const COLORS = {
  perf: 0x2c6e49,
  perfHole: 0xd6b86a,
  transistor: 0x15181c,
  resistor: 0xd8c9a3,
  led: 0x6a4c93,
  ledLens: 0xb9a3e3,
  irPlus: 0xff7043,
  irMinus: 0x4a525c,
  irSignal: 0xe879a9,
} as const

/** Un des 3 fils de l'émetteur infrarouge : broche de l'ESP32 (colonne, rang), couleur et place sur l'embase de la plaque. */
export interface IrWireSpec {
  id: string
  side: Side
  index: number
  color: number
  /** Nom court, écrit sur la plaque. */
  name: string
  /** Hauteur de l'arche du fil au-dessus des broches (mm). */
  arch: number
  pair: string
  where: string
}

export const IR_WIRES: IrWireSpec[] = [
  { id: 'ir5v', side: 'L', index: 18, color: COLORS.irPlus, name: '5V', arch: 14, pair: '5V  →  émetteur IR (+)', where: 'colonne de gauche, tout en bas : la seule broche 5V' },
  { id: 'irgnd', side: 'L', index: 13, color: COLORS.irMinus, name: 'GND', arch: 10, pair: 'GND  →  émetteur IR (−)', where: 'colonne de gauche, sous G12 : le GND du bas' },
  { id: 'irsig', side: 'L', index: 9, color: COLORS.irSignal, name: 'G26', arch: 18, pair: 'G26  →  émetteur IR (signal, base du transistor)', where: 'colonne de gauche, 10e broche en partant du haut' },
]

/** La plaque verte de l'émetteur : centre (x, z) et taille (mm). Ses pastilles et ses pistes sont placées dans helpers.ts. */
export const PERF = { x: -52, z: 11, width: 34, depth: 40 }

/** Point de vue de départ, du dessus, et point regardé. */
export const TARGET: Vec3 = { x: 8, y: 6, z: 14 }
export const START: Vec3 = { x: -30, y: 150, z: 190 }
export const TOP: Vec3 = { x: 8, y: 270, z: 18 }

/** Les bagues des deux résistances (5 bagues : trois chiffres, multiplicateur, tolérance). */
export const BANDS_330 = [0xf08a24, 0xf08a24, 0x111111, 0x111111, 0x7a4a2a]
export const BANDS_47 = [0xf2d24b, 0x8b5cf6, 0x111111, 0xd4af37, 0x7a4a2a]
