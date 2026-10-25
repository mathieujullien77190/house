import { describeEvent, formatTime } from '@/lib/format'
import type { EventRow } from '@/types'
import { AT_CAPTION_PREFIX, CLIP_CAPTION_PREFIX, CLIP_MAX_LEAD_SECONDS, LIVE_CAPTION, LAST_EVENT_PREFIX, NO_EVENT_TEXT } from './constants'

/**
 * De combien le clip commence avant l'événement : la moitié de ce que la vidéo dure en plus de l'événement
 * (pré-capture et post-capture symétriques), jamais plus que la pré-capture configurée, jamais négatif.
 */
export const clipLead = (event: EventRow, videoDuration: number | null): number => {
  if (videoDuration === null || !Number.isFinite(videoDuration)) return 0
  const eventDuration = Math.max(0, (event.ended_at ?? event.started_at) - event.started_at)
  return Math.min(CLIP_MAX_LEAD_SECONDS, Math.max(0, (videoDuration - eventDuration) / 2))
}

/** L'adresse du direct d'une caméra : le cookie de session ouvert par /auth autorise la balise <img>. */
export const liveSrc = (camera: string): string => `/stream?camera=${encodeURIComponent(camera)}`

export const lastEventText = (events: EventRow[]): string =>
  events.length === 0 ? NO_EVENT_TEXT : `${LAST_EVENT_PREFIX}${describeEvent(events[0])}`

export const captionOf = (cursor: number | null, selected: EventRow | null): string => {
  if (selected) return selected.ended_at === null ? describeEvent(selected) : `${CLIP_CAPTION_PREFIX}${describeEvent(selected)}`
  if (cursor !== null) return `${AT_CAPTION_PREFIX}${formatTime(cursor)}`
  return LIVE_CAPTION
}
