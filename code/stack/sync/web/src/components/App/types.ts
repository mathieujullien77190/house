import type { LiveHistory } from '@/lib/live'
import type { Media, Docker, Overview, Power, Specs, System } from '@/types'

export type Status = 'locked' | 'checking' | 'ready'

export type TabId = 'db' | 'disk' | 'system' | 'docker'

export interface AppUIProps {
  status: Status
  message: string
  overview: Overview | null
  /** La consommation, null tant qu'elle n'est pas lue. */
  power: Power | null
  /** La mémoire et le processeur, null tant qu'ils ne sont pas lus. */
  system: System | null
  /** Les caractéristiques de la machine, null tant qu'elles ne sont pas lues. */
  specs: Specs | null
  /** Les dernières mesures du processeur et de la mémoire, en pourcentage. */
  history: LiveHistory
  /** Les caractéristiques de la machine sont ouvertes au départ (écran de bureau), fermées sur mobile. */
  specsOpen: boolean
  /** Les conteneurs Docker, null tant qu'ils ne sont pas lus. */
  docker: Docker | null
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
