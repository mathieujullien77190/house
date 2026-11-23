import type { AcPatch, AcUnit, HueRoom, ShutterCommand, ShutterInfo } from '@/types'
import type { LightsRoom } from '@house/ui'

/** Ce que la page autorise (les interrupteurs de House Sync), tel que `GET /lan/state` le rend. */
export interface LanAccessFlags {
  cameras: boolean
  shutters: boolean
  lights: boolean
  ac: boolean
}

export interface LanCamera {
  id: string
  name: string
  /** Réglée dans House Sync : en portrait (caméra posée de côté), l'image est tournée d'un quart de tour comme dans la WebApp. */
  orientation: 'landscape' | 'portrait'
}

export interface LanShutter {
  id: string
  name: string
  lastCommand: string | null
}

export interface LanAcUnit {
  id: string
  name: string
  reachable: boolean
  power: boolean
  mode: AcUnit['mode']
  targetTemp: number | null
  roomTemp: number | null
  fan: string | null
}

/** La réponse de `GET /lan/state` : une partie coupée (ou illisible) vaut null. */
export interface LanState {
  access: LanAccessFlags
  cameras: LanCamera[] | null
  shutters: LanShutter[] | null
  lights: HueRoom[] | null
  ac: LanAcUnit[] | null
}

/** Pourquoi la page ne montre rien : clé absente ou fausse, page coupée dans House Sync, hors du réseau local, LAN_KEY absente, API muette. */
export type LanProblem = 'locked' | 'disabled' | 'outside' | 'unconfigured' | 'unreachable'

export interface ChezMatouUIProps {
  /** Mode télé (`?tv=1`) : vignettes plus petites, quatre par ligne. */
  tv: boolean
  state: LanState | null
  problem: LanProblem | null
  /** Les zones de lampes de l'onglet Lumière, déjà mises en forme pour `LightsPanel`. */
  rooms: LightsRoom[]
  shutters: ShutterInfo[]
  acUnits: AcUnit[]
  /** L'adresse d'une image des caméras (`/lan/stream/<id>?t=<jeton>`), ou null tant que le jeton manque. */
  streamUrl: (camera: string, hd?: boolean) => string | null
  onStreamError: () => void
  /** La caméra agrandie (son identifiant) ou null. */
  opened: string | null
  onOpenCamera: (camera: string) => void
  onCloseCamera: () => void
  /** L'ordre en route (boutons grisés) : `<partie>:<id>` ; et le texte de la dernière erreur d'ordre. */
  busy: string | null
  error: string | null
  onShutter: (id: string, command: ShutterCommand) => void
  onRoom: (roomId: string, on: boolean) => void
  onLight: (lightId: string, on: boolean) => void
  onAc: (id: string, patch: AcPatch) => void
}

export interface CameraViewProps {
  camera: LanCamera
  /** Le direct léger et le 4K de la caméra (null tant que le jeton manque). */
  lightUrl: string | null
  hdUrl: string | null
  onStreamError: () => void
  onClose: () => void
}
