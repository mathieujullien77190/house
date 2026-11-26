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
  /** Son nom sur le pont : il la relie à son luminaire quand celui-ci est nommé. */
  name: string
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
  /** La lampe visée par un rayon (celui de la souris) : son identifiant, ou null si le rayon ne passe près d'aucune ampoule. */
  pick: (ray: THREE.Ray) => string | null
}

/** Où est un écran de la scène : son centre, la direction vers laquelle il regarde, sa largeur et sa hauteur (m). */
export interface ScreenFrame {
  center: THREE.Vector3
  normal: THREE.Vector3
  width: number
  height: number
}

/** Les écrans qui montrent une caméra : `show` ouvre un direct sur l'un d'eux (ou l'éteint avec null), `update` rafraîchit les images, `hit` rend l'écran qu'un rayon touche, `frame` dit où il est. */
export interface ScreenFeed {
  show: (key: string, src: string | null, portrait?: boolean) => void
  update: (now: number) => void
  hit: (raycaster: THREE.Raycaster) => string | null
  /** L'écran dont le bouton « Voir » est touché par le rayon. */
  button: (raycaster: THREE.Raycaster) => string | null
  frame: (key: string) => ScreenFrame | null
  dispose: () => void
}

/** Ce que la scène expose au composant pour réagir aux boutons et aux lampes. */
export interface SceneHandle {
  /** Toute la scène construite, pour y retrouver les volets. */
  root: THREE.Group
  /** La lumière d'ambiance et le soleil, dosés selon le jour qui entre. */
  ambient: THREE.HemisphereLight
  sun: THREE.DirectionalLight
  controls: OrbitControls
  hood: THREE.Group
  lighting: Lighting
  /** Les écrans (bureau, télé) qui montrent le direct d'une caméra. */
  screen: ScreenFeed
  resetView: () => void
  topView: () => void
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Une caméra de la maison pour les écrans de la scène : son nom, et si son image se montre en portrait (tournée d'un quart de tour). */
export interface SceneCamera {
  name: string
  portrait: boolean
}

export interface Kitchen3DProps {
  apiKey: string
  /** Les caméras de la maison (leurs noms) : les écrans du bureau et la télé montrent leur direct léger, une par clic. */
  cameras?: SceneCamera[]
  /** Le bouton « Voir » d'un écran : ouvre la page de la caméra qu'il montre. */
  onOpenCamera?: (camera: string) => void
}
