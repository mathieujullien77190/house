import type { Status } from '@/lib/useHouse'
import type { Camera, EventRow, TabId } from '@/types'

export interface AppUIProps {
  status: Status
  message: string
  apiKey: string
  cameras: Camera[]
  events: EventRow[]
  tab: TabId
  tabs: { id: TabId; label: string }[]
  onTab: (tab: TabId) => void
  onConnect: (key: string) => void
  onForget: () => void
}
