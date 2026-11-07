/** Ce que renvoient les services de House API. */

export interface CameraRow {
  camera: string
  url: string
}

export interface EventRow {
  id: string
  camera: string
  label: string
  /** Secondes depuis 1970 (horodatage de l'enregistreur). */
  started_at: number
  ended_at: number | null
  /** Chemin du service clips, ou null si le clip n'a pas été copié. */
  clip: string | null
  /** La copie légère du clip (H.264, 720p, lisible partout), ou null si elle n'existe pas encore. */
  clip_h264: string | null
  /** Secondes depuis 1970 : le début réel du clip (il précède l'événement), ou null (anciens clips). */
  clip_started_at: number | null
  /** Sauvegardé : jamais effacé par le ménage (les autres clips le sont après la durée de garde réglée dans House Sync). */
  saved: boolean
}

/** L'alimentation d'une caméra, lue sur le switch (service poe). */
export interface CameraPower {
  camera: string
  port: number
  /** Le PoE du port est activé. */
  on: boolean
  /** Le switch alimente bien la caméra. */
  powered: boolean
  watts: number
  /** go2rtc reçoit son flux : elle a fini de démarrer. */
  streaming: boolean
}

export type TabId = 'home' | 'cameras' | 'lights' | 'plug' | 'api'

/** La prise connectée (TP-Link Kasa), telle que House API la décrit. */
export interface PlugState {
  alias: string
  model: string
  on: boolean
  /** Signal WiFi en dBm. */
  rssi: number
  /** Secondes depuis l'allumage, 0 éteinte. */
  onTime: number
}

/** Une lampe du pont Hue. */
export interface HueLight {
  id: string
  name: string
  on: boolean
  bri: number | null
  reachable: boolean
}

/** Une pièce du pont Hue et ses lampes. */
export interface HueRoom {
  id: string
  name: string
  on: boolean
  bri: number | null
  lights: HueLight[]
}

/** Une règle d'automatisation du pont, en phrases (un horaire ou un détecteur de mouvement). */
export interface HueAutomation {
  id: string
  name: string
  enabled: boolean
  kind: 'horaire' | 'capteur'
  lines: string[]
}

/** Un détecteur de mouvement Hue avec sa température et sa luminosité. */
export interface HueSensor {
  id: string
  name: string
  presence: boolean | null
  /** Le dernier changement de l'état de mouvement (ISO, UTC), ou null. */
  presenceSince: string | null
  temperature: number | null
  lux: number | null
  dark: boolean | null
  battery: number | null
  reachable: boolean
}

/** Un changement : allumer ou éteindre (on), régler la luminosité (bri, 1 à 254). */
export interface HueState {
  on?: boolean
  bri?: number
}

/** Une caméra avec tout ce que la page sait d'elle. */
export interface Camera {
  name: string
}

/** De quoi bâtir le lien de la page invité (GET /guest). */
export interface GuestInfo {
  key: string
  port: number
  /** L'adresse publique, vide tant que la page n'est pas ouverte à internet. */
  url: string
}
