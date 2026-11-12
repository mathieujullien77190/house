import type { RefObject } from 'react'
import type { Side } from '@/lib/esp32Board'
import type * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type CcPin = 'VCC' | 'GND' | 'GDO0' | 'CSN' | 'SCK' | 'MOSI' | 'MISO' | 'GDO2'

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Un des 8 fils entre le module CC1101 et l'ESP32. */
export interface WireSpec {
  cc: CcPin
  side: Side
  /** Rang de la broche de l'ESP32 dans sa colonne, en partant du haut (0 = la première). */
  index: number
  /** Couleur du fil. */
  color: number
  /** Couleur du nom de la broche, si elle diffère de celle du fil (fil blanc, texte lisible sur fond clair). */
  textColor?: string
  /** Hauteur de l'arche du fil au-dessus des broches (mm), pour que deux fils ne se confondent pas. */
  arch: number
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
  /** L'alimentation : prise murale, chargeur USB et câble USB-C. */
  power: THREE.Group
  /** Les 8 fils et les embouts. */
  wires: THREE.Group
  /** Les noms des broches qui ne servent pas. */
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

export interface ShutterWiring3DUIProps {
  hostRef: RefObject<HTMLDivElement | null>
  supported: boolean
  showNames: boolean
  showWires: boolean
  showPower: boolean
  legend: WireLegendItem[]
  /** Le chemin du courant, de la prise murale au module radio, étape par étape. */
  powerSteps: string[]
  onToggleNames: () => void
  onToggleWires: () => void
  onTogglePower: () => void
  onResetView: () => void
  onTopView: () => void
}
