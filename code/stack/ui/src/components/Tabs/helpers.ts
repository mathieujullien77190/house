import { ACTIVE_CLASS, COMPACT_ITEM_CLASS, IDLE_CLASS, ITEM_CLASS, TINY_ITEM_CLASS } from './constants'

export const tabClass = (active: boolean, compact = false, tiny = false): string =>
  `${tiny ? TINY_ITEM_CLASS : compact ? COMPACT_ITEM_CLASS : ITEM_CLASS} ${active ? ACTIVE_CLASS : IDLE_CLASS}`
