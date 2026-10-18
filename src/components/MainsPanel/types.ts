import type { DiagramNode, Phase } from '@/nodes'

export interface MainsPanelProps {
  nodes: DiagramNode[]
  /** L'onduleur n'est prévu qu'en phase 2. */
  phase: Phase
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
