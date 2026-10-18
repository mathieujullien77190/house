import { ACTIVE_CLASS, IDLE_CLASS, ITEM_CLASS } from './constants'
import type { SegmentedItem, SegmentedOption } from './types'

export const buildItems = <T extends string>(options: SegmentedOption<T>[], value: T): SegmentedItem<T>[] => {
  return options.map((o) => ({
    ...o,
    active: o.id === value,
    className: `${ITEM_CLASS} ${o.id === value ? ACTIVE_CLASS : IDLE_CLASS}`,
  }))
}
