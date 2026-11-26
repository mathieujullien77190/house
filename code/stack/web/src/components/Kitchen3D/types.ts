import type * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/** Ce qu'un caisson montre en façade : une porte, des tiroirs, le four et son tiroir, le lave-vaisselle, la porte sous l'évier ou le casier à bouteilles. */
export type ModuleKind = 'door' | 'drawers' | 'oven' | 'dishwasher' | 'sink' | 'wine'

/** Un caisson : ce qu'il montre et sa largeur en mètres. */
export interface ModuleSpec {
  kind: ModuleKind
  width: number
}

/** Une file de caissons bas : l'endroit où elle commence, son orientation et ses caissons dans l'ordre où on les rencontre depuis ce départ. */
export interface RunSpec {
  id: string
  /** Position du départ de la file, côté façade, en mètres. */
  x: number
  z: number
  /** Rotation autour de la verticale : 0 pour le fond, ±π/2 pour les côtés. */
  angle: number
  modules: ModuleSpec[]
  /** Un panneau de lambris sur le bout de la file (le côté qui ne touche rien). */
  endPanel?: boolean
}

export interface SceneParts {
  root: THREE.Group
  /** La hotte et son conduit, pour la cacher. */
  hood: THREE.Group
}

/** Une lampe Hue placée dans la scène (mètres) : son état vient du pont. */
export interface SceneLamp {
  id: string
  x: number
  z: number
  on: boolean
  reachable: boolean
  /** 1 à 254 ; null : pleine puissance. */
  brightness: number | null
  /** #rrggbb ; null : blanc chaud. */
  color: string | null
}

/** L'éclairage de la scène par les lampes Hue : `apply` le met à jour. */
export interface Lighting {
  apply: (lamps: SceneLamp[]) => void
}

/** Ce que la scène expose au composant pour réagir aux boutons et aux lampes. */
export interface SceneHandle {
  controls: OrbitControls
  hood: THREE.Group
  lighting: Lighting
  resetView: () => void
  topView: () => void
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Kitchen3DProps {
  apiKey: string
}
