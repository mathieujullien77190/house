import type { LiveHistory } from '@/lib/live'
import type { CameraEnergy, Media, Docker, HueBridge, LampEnergy, MachineEnergy, NetworkInterface, Overview, Specs, System } from '@/types'

export type Status = 'locked' | 'checking' | 'ready'

export type TabId = 'db' | 'disk' | 'system' | 'docker' | 'settings'

export interface AppUIProps {
  status: Status
  message: string
  overview: Overview | null
  /** La consommation, null tant qu'elle n'est pas lue. */
  /** L'énergie des caméras depuis le début du suivi, null tant qu'elle n'est pas lue. */
  cameraEnergy: CameraEnergy | null
  lampEnergy: LampEnergy | null
  machineEnergy: MachineEnergy | null
  /** La mémoire et le processeur, null tant qu'ils ne sont pas lus. */
  system: System | null
  /** Les caractéristiques de la machine, null tant qu'elles ne sont pas lues. */
  specs: Specs | null
  /** Les cartes réseau (câble RJ45 et WiFi), null tant qu'elles ne sont pas lues. */
  network: NetworkInterface[] | null
  /** Le pont Hue (joignable ou non), null tant qu'il n'est pas lu. */
  bridge: HueBridge | null
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
  onOpen: (media: Media) => void
  onClose: () => void
}
