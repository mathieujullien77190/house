import type * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { AcLabels, CameraState } from './matrix'
import type { Spill } from './spill'

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
  /** La hotte et son conduit. */
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
  /** `flagUnreachable` (vue Matrix) : l'ampoule d'une lampe injoignable est rouge. */
  apply: (lamps: SceneLamp[], flagUnreachable?: boolean) => void
  /** La lampe visée par un rayon (celui de la souris) : son identifiant, ou null si le rayon ne passe près d'aucune ampoule. */
  pick: (ray: THREE.Ray) => string | null
  /** Les lampes allumées de la scène : leur place, leur force, leur couleur, et si elles sont dans la maison. */
  sources: () => { position: THREE.Vector3; intensity: number; color: THREE.Color; indoor: boolean }[]
}

/** Ce que la scène expose au composant pour réagir aux boutons et à la maison. */
export interface SceneHandle {
  /** Toute la scène construite, pour y retrouver les volets. */
  root: THREE.Group
  /** La lumière d'ambiance et le soleil, dosés selon le jour qui entre. */
  ambient: THREE.HemisphereLight
  sun: THREE.DirectionalLight
  controls: OrbitControls
  lighting: Lighting
  /** La lumière des lampes qui sort par les fenêtres aux volets ouverts. */
  spill: Spill
  /** Les étiquettes de température des clims (vue Matrix). */
  labels: AcLabels
  /** Demande une image : la scène n'est dessinée que quand quelque chose a changé. `shadows` : l'ombre du soleil est aussi à refaire. */
  invalidate: (shadows?: boolean) => void
  resetView: () => void
  topView: () => void
  /** La vue « Matrix » : seulement les arêtes de la scène, en vert sur fond noir, et les caméras telles quelles. */
  matrix: (on: boolean) => void
  /** En vue Matrix, remet la couleur des cercles des lampes : jaunes allumées, rouges éteintes. */
  tintLamps: () => void
  /** Le thème de la vue Matrix : clair (gris sur fond clair, thème clair de la WebApp) ou sombre (verts sur fond noir). */
  matrixTheme: (light: boolean) => void
  /** En vue Matrix, la couleur des cercles des caméras d'après leur état (vert en marche, orange en démarrage, rouge coupée ou inconnue). */
  tintCameras: (states: Record<string, CameraState>) => void
  /** En vue Matrix, la couleur des cercles des clims (par identifiant) et du radiateur (`plug`) : verts en marche, rouges sinon. */
  tintDevices: (running: Record<string, boolean | null>) => void
}

/** La lumière de la scène : plein jour forcé (`day`), ou le jour qu'il fait vraiment à cette heure (`now`). */
export type LightMode = 'day' | 'now'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Kitchen3DProps {
  apiKey: string
  /** Ouvre la vraie caméra d'un modèle de caméra cliqué dans la scène (son nom). */
  onOpenCamera?: (name: string) => void
}
