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
  /** Les noms des autres caméras : une icône de caméra par caméra est posé sur l'image du direct, que l'on déplace ; rien sans elles. */
  others?: string[]
  /** Ouvre une autre caméra (un clic sur son icône de caméra). */
  onOpenCamera?: (name: string) => void
  /** L'événement à ouvrir dès l'arrivée (le dernier clip, depuis la mosaïque), ou rien. */
  initialEventId?: string
  /** Appelé avec l'identifiant d'un clip ouvert : il est désormais lu. */
  onRead?: (id: string) => void
}
