import type { Camera, EventRow } from '@/types'

export interface LiveTileProps {
  apiKey: string
  camera: Camera
  /** Le dernier événement de la caméra, ou rien. */
  lastEvent?: EventRow
  /** Le clip du dernier événement a déjà été ouvert. */
  read: boolean
  /** Appelé au clic sur la ligne du dernier événement : la page ouvre la caméra sur son clip ; rien sans clip. */
  onOpenClip?: () => void
  /** Appelé au clic : la page ouvre le détail de la caméra. */
  onOpen: () => void
}
