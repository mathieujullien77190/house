import type { RefObject } from 'react'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Nom affiché sur une pièce du modèle, ancré à une position 3D (en mm). */
export interface PartLabel {
  text: string
  at: [number, number, number]
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
  /** Calque HTML des étiquettes. */
  labels: CSS2DRenderer
  resetView: () => void
}

export interface CameraModel3DUIProps {
  hostRef: RefObject<HTMLDivElement | null>
  supported: boolean
  showLabels: boolean
  legend: string[]
  ariaLabel: string
  onToggleLabels: () => void
  onResetView: () => void
}
