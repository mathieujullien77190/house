import type { Status } from '@/lib/useHouse'
import type { NotifyState } from '@/lib/useMotionNotifications'
import type { Camera, EventRow, TabId } from '@/types'

export interface AppUIProps {
  status: Status
  message: string
  apiKey: string
  cameras: Camera[]
  events: EventRow[]
  /** Le nombre de lampes des zones de la maison (sans celles à placer), ou null tant qu'il n'est pas connu. */
  lampCount: number | null
  /** Le nombre de prises connectées (0 ou 1), ou null tant qu'il n'est pas connu. */
  plugCount: number | null
  /** Écran de téléphone (sous 1024 px) : la vue d'une caméra prend tout l'écran, sans titre ni menu. */
  mobile: boolean
  /** Les notifications de mouvement : non prises en charge, bloquées par le navigateur, coupées ou activées. */
  notify: NotifyState
  onNotify: () => void
  tab: TabId
  /** Le nom de la caméra ouverte en détail, ou null pour la mosaïque. */
  openCamera: string | null
  /** Le clip ouvert avec la caméra, ou rien. */
  openEvent?: string
  isRead: (id: string) => boolean
  onRead: (id: string) => void
  onOpenCamera: (camera: string | null, eventId?: string) => void
  tabs: { id: TabId; label: string }[]
  onTab: (tab: TabId) => void
  onConnect: (key: string) => void
  onForget: () => void
}
