import { ESP_COLORS } from '@/lib/esp32Board'
import type { Vec3, WireGroupSpec } from './types'

// Dimensions en millimètres (1 unité three.js = 1 mm). La carte est à plat à l'origine, l'antenne vers -z (en haut sur le dessin),
// les deux USB-C vers +z (vers le spectateur). Les servos sont à sa droite, devant elle, et le chargeur est devant la carte.
export const VIEW_HEIGHT = 460

export const TITLE = 'Schéma 3D de la mangeoire'
export const INTRO =
  'La carte Freenove ESP32-S3 WROOM CAM, ses deux servos MF90 (remplir et vider) et le chargeur USB-C : les mêmes branchements que le schéma à plat, en volume. Dimensions approximatives.'
export const HINT = 'Glisse (clic gauche ou clic molette) pour tourner, clic droit pour déplacer, molette (ou pincement) pour zoomer. Dimensions approximatives.'
export const ARIA_LABEL = 'Schéma 3D de la mangeoire : une carte ESP32-S3 avec caméra, deux servos, deux câbles Dupont en Y et un chargeur USB-C : glisser pour tourner, molette pour zoomer'
export const NAMES_LABEL = 'Noms des broches'
export const WIRES_LABEL = 'Fils'
export const POWER_LABEL = 'Courant'
export const RESET_LABEL = 'Réinitialiser la vue'
export const TOP_LABEL = 'Vue du dessus'
export const NO_WEBGL_TEXT = 'La vue 3D demande WebGL, que ce navigateur ne propose pas.'
export const WIRES_TITLE = 'Les fils'
export const POWER_TITLE = 'Le courant'
export const NOTE =
  'Câbles Dupont sertis (pince 0,03–0,5 mm²) : une femelle sur la broche de la carte, deux mâles vers les prises des servos. Le 5V et le GND sont chacun un câble en Y, car la carte n’a qu’une broche 5V. La carte a d’autres broches GND : chaque servo peut aussi prendre la sienne, sans Y.'

export const BOARD = { width: 28, length: 57, thickness: 1.6 }
/** Les deux rangées de 20 broches : x de chaque rangée, z de la première broche, et nombre de broches. */
export const HEADER = { x: 12.7, z0: -22.5, count: 20 }

/** Du haut (antenne, caméra) vers le bas (USB-C). */
export const PINS_LEFT = ['3V3', 'EN', '4', '5', '6', '7', '15', '16', '17', '18', '8', '3', '46', '9', '10', '11', '12', '13', '14', '5V']
export const PINS_RIGHT = ['RX', 'TX', '1', '2', '42', '41', '40', '39', '38', '37', '36', '35', '0', '45', '48', '47', '21', '20', '19', 'GND']
/** Les broches repères qu'on nomme même si elles ne servent pas. */
export const REFERENCE_PINS = ['3V3', 'RX', 'TX']

export const COLORS = {
  ...ESP_COLORS,
  signal: 0xe08a1e,
  plus: 0xe5534b,
  minus: 0x7a4a2a,
  flex: 0xd9822b,
  camera: 0x15181c,
  lens: 0x3b4a63,
  led: { red: 0xe5534b, green: 0x3fb950, blue: 0x4c8dff },
  dupont: 0x1b1b1b,
  charger: 0xf2f4f6,
  cable: 0x5a6672,
  plug: 0xcfd5da,
  grid: 0x9aa3b2,
} as const

/** Les quatre groupes de fils. */
export const WIRE_GROUPS: WireGroupSpec[] = [
  { id: 'sig1', color: COLORS.signal, pair: 'GPIO 1  →  signal du servo 1 (remplir)', where: 'rangée de droite, 3e broche en partant du haut' },
  { id: 'sig2', color: COLORS.signal, pair: 'GPIO 2  →  signal du servo 2 (vider)', where: 'rangée de droite, 4e broche, juste sous la broche 1' },
  { id: 'plus', color: COLORS.plus, pair: '5V  →  câble en Y  →  fils rouges des 2 servos', where: 'bas de la rangée de gauche : la seule broche 5V' },
  { id: 'minus', color: COLORS.minus, pair: 'GND  →  câble en Y  →  fils marron des 2 servos', where: 'bas de la rangée de droite' },
]

/** Le servo MF90 : 22,4 × 12,1 mm au sol, deux servos devant et à droite de la carte (x de chacun, z commun). */
export const SERVO_X = [95, 125]
export const SERVO_Z = 40
export const SERVO_NAMES = ['Servo 1 : remplir', 'Servo 2 : vider']
/** Décalage x des trois fils du servo (− marron, + rouge, signal orange) et du boîtier Dupont à 3 broches qui les termine. */
export const SERVO_WIRE_X = { minus: -2.54, plus: 0, signal: 2.54 }
export const DUPONT = { z: 12, length: 8.2, height: 3, depth: 3 }

/** Distance (mm) entre la broche de la carte et l'endroit où le fil du Y se sépare en deux. */
export const Y_SPLIT = 30

/** Le chargeur : devant la carte, son câble branché sur le port USB-C de droite. */
export const CHARGER = { x: 7, z: 97, width: 30, height: 20, depth: 38 }
/** Les deux ports USB-C du bord du bas : x de chacun ; le câble est dans le deuxième. */
export const USB_X = [-7, 7]

/** Point de vue de départ, du dessus, et point regardé. */
export const TARGET: Vec3 = { x: 58, y: 6, z: 35 }
export const START: Vec3 = { x: 40, y: 190, z: 250 }
export const TOP: Vec3 = { x: 58, y: 330, z: 38 }

export const BUTTONS_CLASS = 'mb-2 flex flex-wrap gap-1.5'
export const HOST_CLASS = 'relative w-full cursor-grab overflow-hidden rounded-lg border border-line bg-bg active:cursor-grabbing'
