import type { DiagramNode } from '@/nodes'

export interface MainsPanelProps {
  nodes: DiagramNode[]
}

export interface MainsItem {
  id: string
  label: string
  detail: string
  /** Puissance maximale estimée, en watts (null si non applicable). */
  watts: number | null
}

export interface MainsPanelUIProps {
  items: MainsItem[]
  /** Nombre de prises nécessaires. */
  outlets: number
  totalWatts: number
}
