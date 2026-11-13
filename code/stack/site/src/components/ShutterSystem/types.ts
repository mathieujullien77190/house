import type { ArchView } from '@/components/ArchDiagram'

export type ShutterViewId = 'hardware' | 'software'

export interface ShutterSystemUIProps {
  viewId: ShutterViewId
  view: ArchView
  options: { id: ShutterViewId; label: string }[]
  onViewChange: (id: ShutterViewId) => void
}
