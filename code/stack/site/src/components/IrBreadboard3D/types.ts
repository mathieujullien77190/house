import type { RefObject } from 'react'
import type * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/** Une pièce du montage, avec ce qu'il faut savoir pour la reconnaître. */
export interface BreadboardPart {
  id: string
  name: string
  /** Valeur lue sur la pièce (résistance : « 330 Ω »). */
  value?: string
  /** Couleurs CSS des bagues d'une résistance, de la 1re à la dernière. */
  bands?: string[]
  note: string
}

export interface SceneParts {
  root: THREE.Group
  /** Les fils : jumpers courts de la plaque et câbles Dupont vers l'ESP32. */
  wires: THREE.Group
  /** Les noms (pièces, broches, lignes d'alimentation). */
  names: THREE.Group
}

/** Ce que la scène expose au composant pour réagir aux boutons. */
export interface SceneHandle {
  controls: OrbitControls
  wires: THREE.Group
  names: THREE.Group
  resetView: () => void
  topView: () => void
}

export interface IrBreadboard3DUIProps {
  hostRef: RefObject<HTMLDivElement | null>
  supported: boolean
  showNames: boolean
  showWires: boolean
  steps: string[]
  parts: BreadboardPart[]
  onToggleNames: () => void
  onToggleWires: () => void
  onResetView: () => void
  onTopView: () => void
}
