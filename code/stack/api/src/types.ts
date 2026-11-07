/** Les lignes de la base de House Sync, telles que l'API les lit. */

export interface EventRow {
  id: string
  camera: string
  label: string
  started_at: number
  ended_at: number | null
  clip_path: string | null
  clip_started_at: number | null
  /** La copie légère du clip (H.264, 720p), absente tant que l'enregistreur ne l'a pas faite. */
  clip_web_path: string | null
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
  /** L'original (H.265, 4K), que tous les navigateurs ne savent pas lire. */
  clip: string | null
  /** La copie légère (H.264, 720p), lisible partout ; null si elle n'existe pas (clip ancien ou pas encore fait). */
  clip_h264: string | null
  /** Secondes depuis 1970 : le début réel du clip (il précède l'événement), ou null. */
  clip_started_at: number | null
  /** Sauvegardé : House Sync ne l'efface jamais (les autres le sont après la durée de garde). */
  saved: boolean
}
