import type { LegendItem } from './types'

export const LEGEND_ITEMS: LegendItem[] = [
  { type: 'poe', label: 'Ethernet PoE (données + alim.)' },
  { type: 'eth', label: 'Ethernet' },
  { type: 'power', label: 'Alimentation solaire' },
]

export const LIST_CLASS = 'mt-3 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[0.85rem] text-muted'
