import type { Camera, EventRow } from '@/types'

/** Quelle version du clip lire : la copie légère (H.264, 720p) ou l'original (H.265, 4K). */
export type Quality = 'h264' | 'original'

/** Quel direct afficher : le flux léger (720p environ) ou le 4K recodé en MJPEG (lourd pour le mini PC). */
export type LiveQuality = 'light' | 'hd'

export interface CameraCardProps {
  apiKey: string
  camera: Camera
  /** Les événements de cette caméra seulement, du plus récent au plus ancien. */
  events: EventRow[]
  /** Le retour à la liste des caméras : le bouton fixe en haut à gauche de l'écran du téléphone. */
  onBack?: () => void
}
