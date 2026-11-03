import type { EventRow } from '@/types'

/** « 1 caméra », « 2 caméras » : le mot prend un s au pluriel (zéro et un sont au singulier). */
export const countText = (count: number, word: string): string => `${count} ${word}${count > 1 ? 's' : ''}`

export const eventsOf = (events: EventRow[], camera: string): EventRow[] => events.filter((event) => event.camera === camera)
