import type { Camera, EventRow } from '@/types'

/** Quelle version du clip lire : la copie légère (H.264, 720p) ou l'original (H.265, 4K). */
export type Quality = 'h264' | 'original'

export interface CameraCardProps {
  apiKey: string
  camera: Camera
  /** Les événements de cette caméra seulement, du plus récent au plus ancien. */
  events: EventRow[]
}
