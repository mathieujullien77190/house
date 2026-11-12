import { ESP_COLORS } from '@/lib/esp32Board'
import type { EspWireSpec, PurchaseSpec, ServoSpec, Vec3 } from './types'

// Dimensions en millimètres (1 unité three.js = 1 mm). L'ESP32 est à plat à l'origine, USB-C vers +z (vers le spectateur) ;
// la carte PCA9685 est à sa droite (grand côté le long de x, connecteur de commande vers l'ESP32), les 9 servos devant elle, en une rangée.
export const VIEW_HEIGHT = 460

export const TITLE = 'Schéma 3D des servos des volets Nice'
export const INTRO =
  'Une ESP32 qui commande 9 servos (un par touche des trois télécommandes murales Nice : monter, stop, descendre) par une carte PCA9685 à 16 canaux, avec leur alimentation 5 V. Hors de la boîte : seulement les branchements.'
export const ESP_TITLE = 'Les 4 fils de l’ESP32 à la carte'
export const SERVOS_TITLE = 'Les 9 servos sur la carte'
export const POWER_TITLE = 'Le courant des servos'
export const POWER_LABEL = 'Courant'
export const POWER_STEPS = [
  'Une alimentation 5 V, 2 A minimum, pour les servos seulement : pas le 5 V de l’ESP32.',
  'Son + va sur la borne + du bornier vert de la carte, sa masse sur l’autre borne.',
  'Le condensateur est déjà sur la carte. La masse de l’ESP32 est reliée à la broche GND de la carte : la masse est commune.',
  'La logique de la carte est alimentée en 3,3 V par l’ESP32 (broche VCC) ; les servos le sont en 5 V par le bornier.',
  'L’ESP32 est alimentée à part, par son câble USB-C.',
]
export const WARNING =
  'Le 5 V des servos entre uniquement par le bornier vert, jamais par une broche de l’ESP32 : seule la masse est commune. La broche VCC de la carte est la logique : 3,3 V, jamais 5 V.'
export const NOTE =
  'La carte parle à l’ESP32 en I2C : deux fils (SDA, SCL) plus le 3,3 V et la masse. Chaque canal a trois broches côte à côte : signal (jaune), + (rouge), GND (noir) ; la prise du servo s’y enfiche directement, le fil marron côté noir. Les 9 servos sont sur les canaux 0 à 8, et leur fil de signal est dessiné d’une couleur propre pour le repérer. Les broches 21 et 22 ne sont pas prises par le CC1101 : le matériel de l’ESP32 des volets Somfy pourrait faire les deux, mais ESPSomfy-RTS ne pilote pas cette carte. Dimensions approximatives.'
export const HINT = 'Glisse (clic gauche ou clic molette) pour tourner, clic droit pour déplacer, molette (ou pincement) pour zoomer. Dimensions approximatives.'
export const ARIA_LABEL = 'Schéma 3D d’une carte ESP32, d’une carte PCA9685 et de 9 servos : glisser pour tourner, molette pour zoomer'
export const NAMES_LABEL = 'Noms des broches'
export const WIRES_LABEL = 'Fils'
export const RESET_LABEL = 'Réinitialiser la vue'
export const TOP_LABEL = 'Vue du dessus'
export const PURCHASES_TITLE = 'La liste d’achats'
export const PURCHASES_INTRO = 'Les pièces de ce montage, avec les prix relevés sur Amazon le 12 novembre 2026. Les fils (4 Dupont, 2 de 0,5 mm²) sont déjà là.'
export const PURCHASES_TOTAL_LABEL = 'Total relevé'
export const PURCHASES_UNKNOWN_PRICE = 'à relever'
export const PURCHASES_HEAD = { part: 'Pièce', price: 'Prix' }
export const NO_WEBGL_TEXT = 'La vue 3D demande WebGL, que ce navigateur ne propose pas.'
/** Couleurs des fils marron et rouge dans la légende (les mêmes que dans la scène). */
export const MINUS_CSS = '#7a4a2a'
export const PLUS_CSS = '#e5534b'

export const COLORS = {
  ...ESP_COLORS,
  servo: 0x4b4640,
  boss: 0x2a2d31,
  shaft: 0xcfd3d8,
  horn: 0x1b1b1b,
  plus: 0xe5534b,
  minus: 0x7a4a2a,
  pcaBoard: 0x1f5fa8,
  terminal: 0x2fa84f,
  capacitor: 0x2b5d9a,
  capStripe: 0xcfd5da,
  capYellow: 0xf2d24b,
  capRed: 0xe5534b,
  capBlack: 0x20262c,
  supply: 0xe9edf1,
  supplyPlus: 0xe5534b,
  supplyMinus: 0x20262c,
  usbCable: 0x5a6672,
  grid: 0x9aa3b2,
} as const

/** Les 9 servos, de la télécommande de gauche à celle de droite, touche du haut (monter), du milieu (stop), du bas (descendre) : canaux 0 à 8 de la carte. */
export const SERVOS: ServoSpec[] = [
  { remote: 'PC', action: 'Monter', color: 0x4c8dff },
  { remote: 'PC', action: 'Stop', color: 0x3fb950 },
  { remote: 'PC', action: 'Descendre', color: 0xf2d24b, textColor: '#b8941a' },
  { remote: 'SALON', action: 'Monter', color: 0xf08a24 },
  { remote: 'SALON', action: 'Stop', color: 0xb07cf0 },
  { remote: 'SALON', action: 'Descendre', color: 0xec4899 },
  { remote: 'PORTE', action: 'Monter', color: 0x2dd4bf },
  { remote: 'PORTE', action: 'Stop', color: 0xa3e635, textColor: '#6b9a14' },
  { remote: 'PORTE', action: 'Descendre', color: 0xd5dbe1, textColor: '#8b95a1' },
]

/** Les 4 fils entre l'ESP32 et le connecteur de commande de la carte : 3,3 V, masse, SDA (G21) et SCL (G22). */
export const ESP_WIRES: EspWireSpec[] = [
  { pca: 'VCC', side: 'L', index: 0, color: 0xf08a24, arch: 34, espName: '3V3' },
  { pca: 'GND', side: 'R', index: 6, color: 0x7d8791, arch: 18, espName: 'GND' },
  { pca: 'SDA', side: 'R', index: 5, color: 0x4c8dff, arch: 22, espName: 'G21' },
  { pca: 'SCL', side: 'R', index: 2, color: 0xf2d24b, textColor: '#b8941a', arch: 26, espName: 'G22' },
]

/** La carte PCA9685 (61 × 25 mm) : x de son centre, taille, hauteur du dessus de la carte. */
export const PCA = { x: 80.5, length: 61, depth: 25 }
/** Le connecteur de commande (6 broches sur le petit côté, du fond vers l'avant) : x des broches, puis ordre des noms. */
export const PCA_HEADER = { x: PCA.x - PCA.length / 2 + 2, names: ['GND', 'OE', 'SCL', 'SDA', 'VCC', 'V+'] }
/** Les 16 canaux : x de la première broche, groupes de 4 séparés d'un petit espace, et z des trois rangées (signal, +, GND). */
export const CHANNELS = { x0: 59.3, gap: 1.2, signalZ: 2.2, plusZ: 4.74, minusZ: 7.28 }
/** Le bornier vert de l'alimentation des servos : centre, et x de la borne + puis de la borne −. */
export const TERMINAL = { x: 80, z: -8.4, plusX: 77.5, minusX: 82.6 }

/** Les servos : debout, le long grand côté vers z, côte à côte devant la carte. */
export const SERVO_ROW = { dx: 16, z: 66 }
/** Le servo (MF90, debout) : corps, oreilles, embase et axe, en millimètres. */
export const SERVO = {
  length: 22.4,
  width: 12.1,
  height: 22.8,
  earsLength: 32.2,
  earsAt: 16,
  earsThickness: 2.5,
  shaftFromEnd: 5.9,
  bossR: 4.5,
  bossH: 4,
  shaftR: 2.45,
  shaftH: 6.2,
}

/** La liste d'achats, dans l'ordre du montage. */
export const PURCHASES: PurchaseSpec[] = [
  { id: 'servos', label: 'Servos Miuzei MF90 (lot de 10)', note: '9 servos, un par touche, et 1 de rechange. Micro servo 9 g à engrenages métal, 180°, corne noire.', price: 29.99, url: 'https://www.amazon.fr/dp/B0C1N8VZ1S' },
  { id: 'pca', label: 'Carte PCA9685 Hailege, 16 canaux (lot de 2)', note: '1 carte et 1 de rechange. Elle commande les 9 servos en I2C et distribue leur 5 V (61 × 25 mm).', price: 13.99, url: 'https://www.amazon.fr/dp/B07Y9PTY12' },
  { id: 'esp', label: 'ESP32 NodeMCU 38 broches, USB-C (lot de 2)', note: 'Une seconde ESP32, à part de celle des volets Somfy, et une de rechange (Heemol, puce CP2102, WROOM-32).', price: 18.98, url: 'https://www.amazon.fr/dp/B0DB8F8MKH' },
  { id: 'supply', label: 'Alimentation 5 V 3 A, fiche jack 5,5 × 2,1 mm', note: 'Le 5 V des servos seulement (Security-01).', price: 13.98, url: 'https://www.amazon.fr/dp/B0DF59ZRSD' },
  { id: 'jack', label: 'Connecteurs DC 5,5 × 2,1 mm à bornes à vis, Lunpog (lot de 4)', note: '1 prise femelle sert : elle reçoit la fiche de l’alimentation et donne deux bornes à visser au bornier de la carte. Remplace le lot JZK, livré trop tard.', price: 6.99, url: 'https://www.amazon.fr/dp/B0DKJ5HKPM' },
]

export const TH_CLASS = 'border-b border-line px-2.5 py-1.5 text-left text-xs font-semibold text-muted'
export const TD_CLASS = 'border-b border-line px-2.5 py-1.5 align-middle'
export const NUM_CLASS = 'whitespace-nowrap text-right tabular-nums'
export const LINK_CLASS = 'underline decoration-dotted underline-offset-2 hover:text-accent'

/** La corne simple noire (21,5 mm) : le moyeu, le bout et leur distance, comme dans le modèle de la boîte. */
export const HORN = { hubR: 3.4, tipR: 2, tipAt: 16.1, thickness: 1.5 }

/** Le bloc d'alimentation 5 V, derrière la carte. */
export const SUPPLY = { x: 150, z: -42 }

/** Point de vue de départ, du dessus, et point regardé. */
export const TARGET: Vec3 = { x: 78, y: 6, z: 22 }
export const START: Vec3 = { x: 50, y: 170, z: 215 }
export const TOP: Vec3 = { x: 78, y: 310, z: 24 }

export const BUTTONS_CLASS = 'mb-2 flex flex-wrap gap-1.5'
export const HOST_CLASS = 'relative w-full cursor-grab overflow-hidden rounded-lg border border-line bg-bg active:cursor-grabbing'
