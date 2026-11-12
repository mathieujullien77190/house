import type { RefObject } from 'react'
import type * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Side } from '@/lib/esp32Board'

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Un des 9 servos : celui qui appuie sur une touche d'une télécommande murale. Il est branché sur le canal de même rang de la PCA9685. */
export interface ServoSpec {
  /** Le volet : le nom de la télécommande. */
  remote: string
  /** La touche : monter, stop ou descendre. */
  action: string
  /** Couleur du fil de signal (jaune du servo), pour le repérer parmi les neuf. */
  color: number
  /** Couleur du texte, si elle diffère de celle du fil (fil clair, texte lisible sur fond clair). */
  textColor?: string
}

/** Un des 4 fils entre l'ESP32 et la PCA9685. */
export interface EspWireSpec {
  /** Le nom de la broche de la PCA9685 (VCC, GND, SDA, SCL). */
  pca: string
  /** La broche de l'ESP32 : colonne et rang en partant du haut. */
  side: Side
  index: number
  color: number
  textColor?: string
  /** Hauteur de l'arche du fil au-dessus des broches (mm), pour que deux fils ne se confondent pas. */
  arch: number
  /** Ce que la broche de l'ESP32 est, pour la légende. */
  espName: string
}

export interface WireLegendItem {
  id: string
  /** Couleur CSS du fil. */
  color: string
  pair: string
  where: string
}

export interface ServoLegendItem {
  id: string
  /** Couleur CSS du fil de signal. */
  color: string
  pair: string
  where: string
}

/** Une ligne de la liste d'achats. */
export interface PurchaseSpec {
  id: string
  label: string
  /** Ce qu'on achète exactement, et ce qu'on en fait. */
  note: string
  /** Prix de la ligne en euros ; absent tant qu'il n'est pas relevé. */
  price?: number
  /** La fiche du produit, si on a le lien. */
  url?: string
}

/** Une ligne de la liste d'achats, prête à afficher. */
export interface PurchaseRow {
  id: string
  label: string
  note: string
  /** Le prix écrit (« 29,99 € »), ou « à relever ». */
  price: string
  url?: string
}

export interface SceneParts {
  root: THREE.Group
  /** L'alimentation 5 V des servos : bloc, bornier et leurs fils ; le câble USB-C de l'ESP32. */
  power: THREE.Group
  /** Les fils : 4 entre l'ESP32 et la carte, 3 par servo. */
  wires: THREE.Group
  /** Les noms des broches de l'ESP32 qui ne servent pas. */
  pinNames: THREE.Group
}

/** Ce que la scène expose au composant pour réagir aux boutons. */
export interface SceneHandle {
  controls: OrbitControls
  power: THREE.Group
  wires: THREE.Group
  pinNames: THREE.Group
  resetView: () => void
  topView: () => void
}

export interface ServoWiring3DUIProps {
  hostRef: RefObject<HTMLDivElement | null>
  supported: boolean
  showNames: boolean
  showWires: boolean
  showPower: boolean
  /** Les 4 fils entre l'ESP32 et la carte. */
  legend: WireLegendItem[]
  /** Les 9 servos, avec leur canal. */
  servoLegend: ServoLegendItem[]
  /** Le branchement du courant des servos, étape par étape. */
  powerSteps: string[]
  /** La liste d'achats sous le schéma, et son total (les lignes dont le prix est relevé). */
  purchases: PurchaseRow[]
  purchasesTotal: string
  onToggleNames: () => void
  onToggleWires: () => void
  onTogglePower: () => void
  onResetView: () => void
  onTopView: () => void
}
