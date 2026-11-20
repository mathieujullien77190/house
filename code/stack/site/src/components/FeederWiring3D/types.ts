import type { RefObject } from 'react'
import type * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Une rangée de broches de la carte : à gauche ou à droite, vue du dessus, l'antenne en haut. */
export type RowSide = 'L' | 'R'

/** Un groupe de fils du montage, pour la légende. */
export interface WireGroupSpec {
  id: string
  color: number
  pair: string
  where: string
}

export interface WireLegendItem {
  id: string
  /** Couleur CSS du fil. */
  color: string
  pair: string
  where: string
}

export interface SceneParts {
  root: THREE.Group
  /** Le chargeur USB-C et son câble. */
  power: THREE.Group
  /** Les fils : 3 par servo et les fils vers la carte. */
  wires: THREE.Group
  /** Les noms des broches de la carte. */
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

export interface FeederWiring3DUIProps {
  hostRef: RefObject<HTMLDivElement | null>
  supported: boolean
  showNames: boolean
  showWires: boolean
  showPower: boolean
  legend: WireLegendItem[]
  powerSteps: string[]
  onToggleNames: () => void
  onToggleWires: () => void
  onTogglePower: () => void
  onResetView: () => void
  onTopView: () => void
}
