import type { Status } from '@/lib/useHouse'
import type { Camera, EventRow, TabId } from '@/types'

export interface AppUIProps {
  status: Status
  message: string
  apiKey: string
  cameras: Camera[]
  events: EventRow[]
  /** L'origine de Frigate (lien et iframe), vide si inconnue. */
  frigateOrigin: string
  tab: TabId
  tabs: { id: TabId; label: string }[]
  onTab: (tab: TabId) => void
  onConnect: (key: string) => void
  onForget: () => void
}
