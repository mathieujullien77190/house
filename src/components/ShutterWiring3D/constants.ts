import type { CcPin, Vec3, WireSpec } from './types'

// Dimensions en millimètres (1 unité three.js = 1 mm). L'ESP32 est à plat, USB-C vers +z (vers le spectateur),
// le module CC1101 à sa droite.
export const VIEW_HEIGHT = 460
export const PITCH = 2.54
/** Hauteur du bout des broches au-dessus de la carte. */
export const PIN_TOP = 8.5
/** Les deux colonnes de broches sont à ± cette distance de l'axe de la carte. */
export const PIN_X = 12.7
/** Position de la première broche d'une colonne, puis le pas, sur l'axe z. */
export const PIN_Z0 = -22.86

export const TITLE = 'Schéma 3D du montage'
export const INTRO = 'Les 8 fils entre le module radio CC1101 (433 MHz) et la carte ESP32, et le courant qui les alimente, pour piloter les volets Somfy.'
export const POWER_TITLE = 'Le courant'
export const POWER_LABEL = 'Courant'
/** Du mur au module radio : chaque étape est visible dans la scène. */
export const POWER_STEPS = [
  'Prise murale 230 V.',
  'Chargeur USB 5 V : n’importe quel chargeur de téléphone, 1 A suffit.',
  'Câble USB-C de données, du chargeur à l’ESP32 (5 V).',
  'L’ESP32 fabrique le 3,3 V et le donne au CC1101 par le fil rouge VCC : le module n’a pas d’autre alimentation.',
]
export const WARNING = '3V3, jamais 5 V : le fil rouge va sur la broche 3V3, tout en haut à gauche. La broche 5V, tout en bas à gauche, grille le module. Visse l’antenne avant de brancher l’USB.'
export const NOTE =
  'Les broches du CC1101 suivent la numérotation courante des modules à 8 broches, par paires côte à côte : 1 GND et 2 VCC, 3 GDO0 et 4 CSN, 5 SCK et 6 MOSI, 7 MISO et 8 GDO2. Les numéros 1 et 2 sont imprimés à un bout du module, 7 et 8 à l’autre. Vérifie avant de brancher le courant : la broche 1 (GND) doit sonner au multimètre avec la couronne extérieure du connecteur d’antenne.'
export const HINT = 'Glisse (clic gauche ou clic molette) pour tourner, clic droit pour déplacer, molette (ou pincement) pour zoomer. Dimensions approximatives.'
export const ARIA_LABEL = 'Schéma 3D du montage d’une carte ESP32 et d’un module CC1101 : glisser pour tourner, molette pour zoomer'
export const NAMES_LABEL = 'Noms des broches'
export const WIRES_LABEL = 'Fils'
export const RESET_LABEL = 'Réinitialiser la vue'
export const TOP_LABEL = 'Vue du dessus'
export const WIRES_TITLE = 'Les 8 fils'
export const NO_WEBGL_TEXT = 'La vue 3D demande WebGL, que ce navigateur ne propose pas.'

export const COLORS = {
  board: 0x1a1e23,
  chip: 0xbac1c8,
  antennaZone: 0x15181c,
  usb: 0xcfd5da,
  button: 0xd8dde1,
  header: 0x0d0f12,
  pin: 0xc9b25a,
  ccBoard: 0x1f5fa8,
  sma: 0xd4af37,
  rod: 0x20262c,
  charger: 0xe9edf1,
  chargerPort: 0x20262c,
  usbCable: 0x5a6672,
  wall: 0x9aa3b2,
  grid: 0x9aa3b2,
  titleText: '#6b7684',
  mutedText: '#8b95a1',
} as const

/** Noms des broches de l'ESP32 38 broches, du haut (antenne) vers le bas (USB-C). */
export const ESP_LEFT = ['3V3', 'EN', 'VP', 'VN', 'G34', 'G35', 'G32', 'G33', 'G25', 'G26', 'G27', 'G14', 'G12', 'GND', 'G13', 'SD2', 'SD3', 'CMD', '5V']
export const ESP_RIGHT = ['GND', 'G23', 'G22', 'TX', 'RX', 'G21', 'GND', 'G19', 'G18', 'G5', 'G17', 'G16', 'G4', 'G0', 'G2', 'G15', 'SD1', 'SD0', 'CLK']

/** Le support 2 × 4 du CC1101 : première broche (x, z), puis place de chaque nom (colonne, rang). */
export const CC_ORIGIN = { x: 38.5, z: -14 }
export const CC_PINS: Record<CcPin, [number, number]> = {
  GND: [0, 0],
  VCC: [1, 0],
  GDO0: [0, 1],
  CSN: [1, 1],
  SCK: [0, 2],
  MOSI: [1, 2],
  MISO: [0, 3],
  GDO2: [1, 3],
}

/** Les numéros imprimés sur le module (1 et 2 à un bout, 7 et 8 à l'autre, par paires côte à côte) : la numérotation courante des modules à 8 broches. */
export const CC_NUMBERS: Record<CcPin, number> = { GND: 1, VCC: 2, GDO0: 3, CSN: 4, SCK: 5, MOSI: 6, MISO: 7, GDO2: 8 }

/** Les 8 fils. Source des numéros de broche : le wiki d'ESPSomfy-RTS (GDO0 pour l'émission, GDO2 pour la réception). */
export const WIRES: WireSpec[] = [
  { cc: 'VCC', side: 'L', index: 0, color: 0xe5534b, arch: 20, where: 'colonne de gauche, 1re broche en haut' },
  { cc: 'GND', side: 'R', index: 0, color: 0x7d8791, arch: 6, where: 'colonne de droite, 1re broche en haut (fil noir)' },
  { cc: 'MOSI', side: 'R', index: 1, color: 0x4c8dff, arch: 9, where: 'colonne de droite, 2e broche' },
  { cc: 'MISO', side: 'R', index: 7, color: 0x3fb950, arch: 11, where: 'colonne de droite, après le 2e GND' },
  { cc: 'SCK', side: 'R', index: 8, color: 0xf2d24b, textColor: '#b8941a', arch: 13, where: 'colonne de droite, sous G19' },
  { cc: 'CSN', side: 'R', index: 9, color: 0xf08a24, arch: 15, where: 'colonne de droite, sous G18' },
  { cc: 'GDO0', side: 'L', index: 14, color: 0xb07cf0, arch: 17, where: 'colonne de gauche, près du bas, sous GND (émission)' },
  { cc: 'GDO2', side: 'L', index: 12, color: 0xd5dbe1, textColor: '#8b95a1', arch: 15, where: 'colonne de gauche, au-dessus de GND (réception)' },
]

/** Point de vue de départ, du dessus, et point regardé. */
export const TARGET: Vec3 = { x: 26, y: 6, z: 14 }
export const START: Vec3 = { x: -34, y: 118, z: 152 }
export const TOP: Vec3 = { x: 26, y: 215, z: 19 }

/** L'alimentation : le chargeur USB est dans l'axe de l'USB-C, la prise murale derrière lui. */
export const POWER = { chargerZ: 52, chargerDepth: 28, chargerSize: 26, y: 15, wallZ: 89.5 }

export const BUTTONS_CLASS = 'mb-2 flex flex-wrap gap-1.5'
export const HOST_CLASS = 'relative w-full cursor-grab overflow-hidden rounded-lg border border-line bg-bg active:cursor-grabbing'
