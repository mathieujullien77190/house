import { linkClass } from '@/lib/linkStyles'
import type { LegendItem, LegendSwatch } from './types'

export const toSwatches = (items: LegendItem[]): LegendSwatch[] => {
  return items.map((item) => ({ ...item, className: linkClass(item.type) }))
}
