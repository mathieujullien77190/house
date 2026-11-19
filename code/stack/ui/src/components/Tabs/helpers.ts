import { ACTIVE_CLASS, BLOCK_ITEM_CLASS, BLOCK_TINY_ITEM_CLASS, COMPACT_ITEM_CLASS, IDLE_CLASS, ITEM_CLASS, TINY_ITEM_CLASS } from './constants'

export const tabClass = (active: boolean, compact = false, tiny = false, block = false): string =>
  `${block ? (tiny ? BLOCK_TINY_ITEM_CLASS : BLOCK_ITEM_CLASS) : tiny ? TINY_ITEM_CLASS : compact ? COMPACT_ITEM_CLASS : ITEM_CLASS} ${active ? ACTIVE_CLASS : IDLE_CLASS}`
