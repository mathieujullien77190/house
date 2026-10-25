import type { Media, Overview } from '@/types'

export type Status = 'locked' | 'checking' | 'ready'

export type TabId = 'db' | 'disk'

export interface AppUIProps {
  status: Status
  message: string
  overview: Overview | null
  /** Heure du dernier chargement, vide avant le premier. */
  loadedAt: string
  media: Media | null
  /** Change à chaque rafraîchissement : les sections rechargent leur page. */
  refreshTick: number
  tab: TabId
  onTab: (tab: TabId) => void
  onConnect: (key: string) => void
  onLogout: () => void
  onRefresh: () => void
  onOpen: (media: Media) => void
  onClose: () => void
}
