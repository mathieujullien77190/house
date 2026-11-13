import type { LinkType } from '@/nodes'

export interface LegendItem {
  type: LinkType
  label: string
}

export interface LegendSwatch extends LegendItem {
  /** Classes Tailwind du trait d'exemple. */
  className: string
}

export interface LegendUIProps {
  swatches: LegendSwatch[]
}
