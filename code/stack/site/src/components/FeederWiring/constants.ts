import type { PinRow, WireSpec } from './types'

export const TITLE = 'Montage de la mangeoire (carte ESP32-S3 avec caméra et 2 servos)'
export const INTRO =
  'Une seule carte Freenove ESP32-S3 CAM fait tout : sa caméra est déjà dessus, les deux servos (remplir et vider la gamelle) se branchent sur deux broches et sur le 5 V de l’USB. Les servos ne tournent jamais en même temps. Le détail est dans docs/mangeoire.md.'
export const ARIA_LABEL = 'Schéma de câblage : un chargeur USB-C, une carte ESP32-S3 avec caméra et deux servos'
export const BOARD_LABEL = 'Freenove ESP32-S3 CAM'
export const CAMERA_LABEL = 'objectif (la gamelle)'
export const CHARGER_LABEL = 'Chargeur USB-C 5 V'
export const CHARGER_AMPS = '2 à 3 A'
export const SERVO_FILL_LABEL = 'Servo 1 : remplir'
export const SERVO_EMPTY_LABEL = 'Servo 2 : vider'
export const SERVO_WIRES_LABEL = 'orange · rouge · marron'

/** Les couleurs des fils d'un servo MF90 : signal orange, + rouge, − marron. */
export const SIGNAL_COLOR = '#e08a1e'
export const PLUS_COLOR = '#e5534b'
export const MINUS_COLOR = '#7a4a2a'
export const CABLE_COLOR = '#5a6672'

/** Les fils, dans le repère du schéma : la carte à gauche (x 190 à 390), les servos à droite (x 560). */
export const WIRES: WireSpec[] = [
  { id: 'cable', label: 'câble USB-C', color: CABLE_COLOR, points: '170,415 290,415 290,375' },
  { id: 'sig1', label: 'GPIO 1 → signal du servo 1', color: SIGNAL_COLOR, points: '390,90 470,90 470,100 560,100' },
  { id: 'sig2', label: 'GPIO 2 → signal du servo 2', color: SIGNAL_COLOR, points: '390,114 460,114 460,224 560,224' },
  { id: 'plus', label: '5V → fils rouges', color: PLUS_COLOR, points: '190,345 190,435 520,435 520,110 560,110' },
  { id: 'plus2', label: '5V → servo 2', color: PLUS_COLOR, points: '520,234 560,234' },
  { id: 'minus', label: 'GND → fils marron', color: MINUS_COLOR, points: '390,345 540,345 540,120 560,120' },
  { id: 'minus2', label: 'GND → servo 2', color: MINUS_COLOR, points: '540,244 560,244' },
]

export const PIN_ROWS: PinRow[] = [
  { id: 'sig1', signal: 'Servo 1 (remplir), signal', pin: 'GPIO 1', note: 'rangée de droite, tout en haut, sous RX et TX' },
  { id: 'sig2', signal: 'Servo 2 (vider), signal', pin: 'GPIO 2', note: 'juste sous la broche 1' },
  { id: 'plus', signal: '5 V des deux servos (fils rouges)', pin: '5V', note: 'bas de la rangée de gauche ; le 5 V de l’USB, pas le 3V3' },
  { id: 'minus', signal: 'Masse des deux servos (fils marron)', pin: 'GND', note: 'bas de la rangée de droite' },
]
export const PINS_TITLE = 'Les broches'
export const PINS_HEAD = { signal: 'Fil', pin: 'Broche' }
export const AVOID_TEXT = 'À éviter : 35, 36, 37 (mémoire PSRAM), 19 et 20 (USB), 0 et 45 (démarrage), 48 (LED RGB). La caméra occupe les broches 4 à 13 et 15 à 18.'
export const CONFIRM_TEXT = 'Les numéros viennent des photos de l’annonce : à confirmer avec le chapitre « Notes for GPIO » du tutoriel de Freenove à la réception.'
export const POWER_TITLE = 'Le courant'
export const POWER_STEPS = [
  'Un chargeur USB-C 5 V de 2 A au moins (3 A de préférence), avec un câble court et épais.',
  'Les fils rouges des servos vont sur la broche 5V de la carte : le courant vient du chargeur, l’ESP32 ne le fournit pas.',
  'Jamais un fil rouge sur 3V3. Les masses sont communes : fils marron sur GND.',
  'Un seul servo bouge à la fois : le courant est celui d’un servo (0,2 à 0,7 A), sans condensateur.',
  'Dans le programme : signal coupé après chaque mouvement, durée limitée si un servo force (graine coincée).',
]
export const STATE_TEXT = 'État au 19 novembre 2026 : projet, rien n’est commandé ni codé.'
