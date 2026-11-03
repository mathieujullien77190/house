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

/** Un détecteur de mouvement d'un groupe, avec ses mesures déjà écrites (le parent formate). */
export interface LightsSensor {
  id: string
  name: string
  /** Un mouvement est détecté en ce moment ; null si inconnu. */
  motion: boolean | null
  /** « Mouvement », ou « Calme depuis 02/11 15:44 ». */
  motionText: string
  /** Les mesures à côté : température, luminosité, pile. */
  readings: string[]
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
  /** Les détecteurs de mouvement du groupe, sous ses lampes. */
  sensors?: LightsSensor[]
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
