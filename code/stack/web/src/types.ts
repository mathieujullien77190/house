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
  /** Secondes depuis 1970 : le début réel du clip (il précède l'événement), ou null (anciens clips). */
  clip_started_at: number | null
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

export type TabId = 'cameras' | 'api'

/** Une caméra avec tout ce que la page sait d'elle. */
export interface Camera {
  name: string
}
