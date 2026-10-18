import type { RefObject } from 'react'
import type { Group } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

/** Modèle affiché : la Reolink ou la mini-cam Pi Zero. */
export type CameraModelKind = 'camera' | 'zero'

export interface CameraModel3DProps {
  kind: CameraModelKind
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Nom affiché sur une pièce du modèle, ancré à une position 3D (en mm). */
export interface PartLabel {
  text: string
  at: [number, number, number]
  /** Vrai pour les accessoires masquables (splitter, adaptateur) : l'étiquette suit leur visibilité. */
  extra?: boolean
}

export interface ModelSpec {
  /** Position de départ de la caméra de la scène et point regardé. */
  position: Vec3
  target: Vec3
  /** Hauteur du sol (grille). */
  floorY: number
  legend: string[]
  /** Noms affichés sur les pièces du modèle. */
  labels: PartLabel[]
  ariaLabel: string
}

/** Ce que la scène expose au composant pour réagir aux boutons. */
export interface SceneHandle {
  controls: OrbitControls
  extras: Group
  /** Calque HTML des étiquettes. */
  labels: CSS2DRenderer
  resetView: () => void
}

export interface CameraModel3DUIProps {
  hostRef: RefObject<HTMLDivElement | null>
  supported: boolean
  showLabels: boolean
  showExtras: boolean
  /** Vrai quand le modèle a des accessoires masquables (splitter et adaptateur du Pi Zero). */
  hasExtras: boolean
  legend: string[]
  ariaLabel: string
  onToggleLabels: () => void
  onToggleExtras: () => void
  onResetView: () => void
}
