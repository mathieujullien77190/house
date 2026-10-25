/** Les lignes de la base de House Sync, telles que l'API les lit. */

export interface EventRow {
  id: string
  camera: string
  label: string
  started_at: number
  ended_at: number | null
  clip_path: string | null
}

export interface CameraRow {
  camera: string
  url: string
}

/** Un événement tel que l'API le renvoie : le chemin du clip devient une adresse de service. */
export interface EventDto {
  id: string
  camera: string
  label: string
  started_at: number
  ended_at: number | null
  clip: string | null
}
