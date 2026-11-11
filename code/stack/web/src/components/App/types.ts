import type { Status } from '@/lib/useHouse'
import type { NotifyState } from '@/lib/useMotionNotifications'
import type { Camera, EventRow, TabId } from '@/types'

export interface AppUIProps {
  status: Status
  message: string
  apiKey: string
  cameras: Camera[]
  events: EventRow[]
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
  /** L'instant (secondes) de l'image à montrer avec la caméra ouverte (depuis l'image d'une autre caméra). */
  openAt?: number
  /** Le rang de la vitesse de défilement des images gardée d'une caméra à l'autre. */
  openRate?: number
  /** Le son du direct ouvert sur la caméra d'où l'on vient. */
  openSound?: boolean
  isRead: (id: string) => boolean
  onRead: (id: string) => void
  onOpenCamera: (camera: string | null, eventId?: string, at?: number, rate?: number, sound?: boolean) => void
  tabs: { id: TabId; label: string }[]
  onTab: (tab: TabId) => void
  onConnect: (key: string) => void
}
