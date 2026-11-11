import type { Camera, EventRow } from '@/types'

/** Quelle version du clip lire : la copie légère (H.264, 720p) ou l'original (H.265, 4K). */
export type Quality = 'h264' | 'original'

/** Quel direct afficher : le flux léger (720p environ) ou le 4K recodé en MJPEG (lourd pour le mini PC). */
export type LiveQuality = 'light' | 'hd'
/** Le sélecteur du direct : L, 4K ou Off (Off éteint la caméra au niveau du PoE). */
export type LiveChoice = LiveQuality | 'off'

export interface CameraCardProps {
  apiKey: string
  camera: Camera
  /** Les événements de cette caméra seulement, du plus récent au plus ancien. */
  events: EventRow[]
  /** Le retour à la liste des caméras : le bouton fixe en haut à gauche de l'écran du téléphone. */
  onBack?: () => void
  /** Les noms des autres caméras : une icône de caméra par caméra est posé sur l'image du direct, que l'on déplace ; rien sans elles. */
  others?: string[]
  /** Ouvre une autre caméra (un clic sur son icône de caméra) ; `at` : l'instant de l'image regardée (secondes), que l'autre caméra montre aussi. */
  onOpenCamera?: (name: string, at?: number, rate?: number, sound?: boolean) => void
  /** L'instant (secondes) de l'image à montrer dès l'arrivée, depuis l'image d'une autre caméra ; sans lui, le direct. */
  initialCursor?: number
  /** Le rang (dans `RATES`) de la vitesse de défilement des images à garder en arrivant, depuis une autre caméra ; sans lui, le temps réel. */
  initialRate?: number
  /** Le son du direct est ouvert dès l'arrivée (il l'était sur la caméra d'où l'on vient). */
  initialSound?: boolean
  /** L'événement à ouvrir dès l'arrivée (le dernier clip, depuis la mosaïque), ou rien. */
  initialEventId?: string
  /** Appelé avec l'identifiant d'un clip ouvert : il est désormais lu. */
  onRead?: (id: string) => void
}
