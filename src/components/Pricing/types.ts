import type { Counts, Source, Warning } from '@/catalog'
import type { DiagramNode, NodeKind, Phase } from '@/nodes'

export interface PricingProps {
  /** Phase affichée : les lignes propres à l'autre phase sont masquées. */
  phase: Phase
  counts: Counts
  /** Composants libres du schéma, comptés avec leur prix saisi. */
  customs: DiagramNode[]
  onAdd: (kind: NodeKind) => void
  onRemove: (kind: NodeKind) => void
  onReset: () => void
}

export interface PricingRowView {
  id: string
  label: string
  note?: string
  unit: string
  qty: number
  total: string
  source: Source
  sourceLabel: string
  /** Compteur réglable avec +/− (sinon la quantité est calculée). */
  editable?: keyof Counts
  dimmed: boolean
}

export interface PricingSectionView {
  group: string
  subtotal: string
  rows: PricingRowView[]
}

export interface PricingUIProps {
  sections: PricingSectionView[]
  total: string
  estimated: string
  ports: string
  warnings: Warning[]
  onQuantityChange: (key: keyof Counts, value: number) => void
  onReset: () => void
}
