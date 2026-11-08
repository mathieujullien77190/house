import type { Camera, EventRow } from '@/types'

export interface CameraMosaicProps {
  apiKey: string
  cameras: Camera[]
  /** Les événements récents de toutes les caméras, du plus récent au plus ancien. */
  events: EventRow[]
  /** Ce clip a-t-il déjà été ouvert ? */
  isRead: (id: string) => boolean
  /** Appelé avec le nom de la caméra dont on clique la vignette, et le clip dont on clique la ligne (rien pour la vignette seule). */
  onOpen: (camera: string, eventId?: string) => void
}
