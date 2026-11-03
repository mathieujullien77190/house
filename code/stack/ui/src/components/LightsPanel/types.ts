/** Une lampe d'une pièce. */
export interface LightsLamp {
  id: string
  name: string
  on: boolean
  /** Luminosité de 1 à 254 ; null pour une lampe qui ne varie pas. */
  bri: number | null
  /** La lampe répond au pont (une lampe coupée à l'interrupteur ne répond pas). */
  reachable: boolean
}

/** Une pièce et ses lampes. */
export interface LightsRoom {
  id: string
  name: string
  /** Au moins une lampe est allumée. */
  on: boolean
  /** La luminosité de la pièce (1 à 254), ou null si inconnue. */
  bri: number | null
  lights: LightsLamp[]
  /** Des lampes sans pièce : pas de commande groupée. */
  ungrouped?: boolean
}

/** Un changement demandé : allumer ou éteindre (on), régler la luminosité (bri, 1 à 254). */
export interface LightsChange {
  on?: boolean
  bri?: number
}

export interface LightsPanelProps {
  rooms: LightsRoom[]
  /** Ce qui est en cours de changement : « all », « room:<id> » ou « light:<id> » ; son bouton est désactivé. */
  busy: string
  /** La luminosité en pourcentage pendant que le curseur bouge, par « room:<id> » ou « light:<id> ». */
  drafts: Record<string, number>
  /** Allumer ou éteindre d'un coup les lampes que le parent choisit (le bouton « Tout allumer » ou « Tout éteindre »). */
  onAll: (on: boolean) => void
  onRoom: (roomId: string, change: LightsChange) => void
  onLight: (lightId: string, change: LightsChange) => void
  /** Le curseur bouge : le parent garde la valeur en attendant le relâchement. */
  onDraft: (key: string, percent: number) => void
}
