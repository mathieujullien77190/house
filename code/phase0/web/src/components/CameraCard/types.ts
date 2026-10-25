import type { Camera, EventRow } from '@/types'

export interface CameraCardProps {
  apiKey: string
  camera: Camera
  /** Les événements de cette caméra seulement, du plus récent au plus ancien. */
  events: EventRow[]
}

export interface CameraCardUIProps {
  apiKey: string
  name: string
  /** Adresse de la dernière image avec son paramètre anti-cache, vide si Frigate n'en donne pas. */
  imageSrc: string
  /** L'instant choisi sur la frise (image gardée par House Sync), ou null. */
  cursor: number | null
  /** L'événement choisi sur la frise (son clip remplace l'image), ou null. */
  selected: EventRow | null
  /** Légende au-dessus de l'image : « Dernière image », « Image à … » ou « Clip · … ». */
  caption: string
  lastEventText: string
  events: EventRow[]
  /** Position de lecture du clip ouvert, en secondes absolues, pour que le curseur de la frise la suive. */
  playhead: number | null
  /** Où le lecteur doit démarrer, en secondes depuis le début du clip (instant cliqué dans le bloc). */
  clipStart: number
  onCursor: (time: number | null) => void
  onEvent: (event: EventRow | null, at: number | null) => void
  /** Avancée du clip, en secondes depuis son début. */
  onClipTime: (seconds: number) => void
  /** Durée réelle du clip, une fois connue. */
  onClipDuration: (seconds: number) => void
  /** Revenir à la dernière image (après une erreur du lecteur) ; sinon c'est « Maintenant » de la frise qui le fait. */
  onBack: () => void
  onImageError: () => void
}
