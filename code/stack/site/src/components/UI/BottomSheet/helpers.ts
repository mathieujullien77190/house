import { BASE_CLASS, CLOSED_CLASS, OPEN_CLASS } from './constants'

export const sheetClass = (open: boolean): string => `${BASE_CLASS} ${open ? OPEN_CLASS : CLOSED_CLASS}`
