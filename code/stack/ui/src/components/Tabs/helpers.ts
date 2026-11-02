import { ACTIVE_CLASS, IDLE_CLASS, ITEM_CLASS } from './constants'

export const tabClass = (active: boolean): string => `${ITEM_CLASS} ${active ? ACTIVE_CLASS : IDLE_CLASS}`
