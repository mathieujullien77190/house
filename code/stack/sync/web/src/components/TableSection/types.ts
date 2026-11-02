import type { Media, TableSummary } from '@/types'

export interface TableSectionProps {
  table: TableSummary
  /** Change à chaque rafraîchissement demandé par la page : la section recharge sa page courante. */
  refreshTick: number
  onOpen: (media: Media) => void
}
