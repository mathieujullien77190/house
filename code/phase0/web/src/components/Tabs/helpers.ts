import { ACTIVE_CLASS, IDLE_CLASS, ITEM_CLASS } from './constants'
import type { TabItem, TabOption } from './types'

export const buildItems = <T extends string>(options: TabOption<T>[], value: T): TabItem<T>[] =>
  options.map((option) => ({
    ...option,
    active: option.id === value,
    className: `${ITEM_CLASS} ${option.id === value ? ACTIVE_CLASS : IDLE_CLASS}`,
  }))
