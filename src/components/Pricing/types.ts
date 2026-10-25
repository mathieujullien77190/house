import type { Counts, Source, Warning } from '@/catalog'
import type { DiagramNode, NodeKind, Phase } from '@/nodes'

export interface PricingProps {
  /** Phase affichée : les lignes propres à l'autre phase sont masquées. */
  phase: Phase
  counts: Counts
  /** Composants libres du schéma, comptés avec leur prix saisi. */
  customs: DiagramNode[]
  /** Les composants déjà achetés en phase 0 (phase 1 : non recomptés), ou null. */
  owned: Counts | null
  /** Ce que la phase 0 a coûté (phase 1 : pour afficher le total « avec »), 0 sinon. */
  credit: number
  onAdd: (kind: NodeKind) => void
  onRemove: (kind: NodeKind) => void
  onReset: () => void
}

export interface PricingRowView {
  id: string
  label: string
  note?: string
  /** Page du produit : le libellé devient un lien. */
  url?: string
  unit: string
  qty: number
  total: string
  source: Source
  sourceLabel: string
  /** Compteur réglable avec +/− (sinon la quantité est calculée). */
  editable?: keyof Counts
}

export interface PricingSectionView {
  group: string
  subtotal: string
  rows: PricingRowView[]
}

/** Le total d'une phase avec et sans ce qui est déjà acheté en phase 0. */
export interface PricingBreakdown {
  withPrevious: string
  owned: string
}

export interface PricingUIProps {
  sections: PricingSectionView[]
  total: string
  /** Présent en phase 1 : le total de la phase 1 « sans » est `total`, ceci donne le « avec ». */
  breakdown?: PricingBreakdown
  estimated: string
  ports: string
  warnings: Warning[]
  onQuantityChange: (key: keyof Counts, value: number) => void
  onReset: () => void
}
