import type { Media, Overview, Power, System } from '@/types'

export type Status = 'locked' | 'checking' | 'ready'

export type TabId = 'db' | 'disk' | 'system' | 'power'

export interface AppUIProps {
  status: Status
  message: string
  overview: Overview | null
  /** La consommation, null tant qu'elle n'est pas lue. */
  power: Power | null
  /** La mémoire et le processeur, null tant qu'ils ne sont pas lus. */
  system: System | null
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
