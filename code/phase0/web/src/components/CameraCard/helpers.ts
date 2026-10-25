import { describeEvent } from '@/lib/format'
import type { EventRow } from '@/types'
import { LAST_EVENT_PREFIX, NO_EVENT_TEXT } from './constants'

/** Ajoute un paramètre qui change à chaque rafraîchissement, pour que le navigateur recharge l'image. */
export const imageSrc = (url: string | null, tick: number): string => (url ? `${url}?t=${tick}` : '')

export const lastEventText = (events: EventRow[]): string =>
  events.length === 0 ? NO_EVENT_TEXT : `${LAST_EVENT_PREFIX}${describeEvent(events[0])}`
