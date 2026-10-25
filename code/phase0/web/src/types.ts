/** Ce que renvoient les services de House API. */

export interface CameraRow {
  camera: string
  url: string
}

export interface EventRow {
  id: string
  camera: string
  label: string
  /** Secondes depuis 1970 (horodatage Frigate). */
  started_at: number
  ended_at: number | null
  /** Chemin du service clips, ou null si le clip n'a pas été copié. */
  clip: string | null
}

export type TabId = 'cameras' | 'api'

/** Une caméra avec tout ce que la page sait d'elle. */
export interface Camera {
  name: string
}
