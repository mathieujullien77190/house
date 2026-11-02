import { describeEvent, formatTime } from '@/lib/format'
import type { EventRow } from '@/types'
import { AT_CAPTION_PREFIX, CLIP_CAPTION_PREFIX, CLIP_MAX_LEAD_SECONDS, LIVE_CAPTION } from './constants'

/**
 * De combien le clip commence avant l'événement. Quand l'enregistreur a donné le début réel du clip, on l'utilise (il
 * commence au segment qui précède l'événement : l'avance varie). Sinon, pour les anciens clips : la moitié de ce que la vidéo dure en plus de l'événement
 * (pré-capture et post-capture symétriques), jamais plus que la pré-capture configurée, jamais négatif.
 */
export const clipLead = (event: EventRow, videoDuration: number | null): number => {
  if (event.clip_started_at !== null) return event.started_at - event.clip_started_at
  if (videoDuration === null || !Number.isFinite(videoDuration)) return 0
  const eventDuration = Math.max(0, (event.ended_at ?? event.started_at) - event.started_at)
  return Math.min(CLIP_MAX_LEAD_SECONDS, Math.max(0, (videoDuration - eventDuration) / 2))
}


export const captionOf = (cursor: number | null, selected: EventRow | null): string => {
  if (selected) return selected.ended_at === null ? describeEvent(selected) : `${CLIP_CAPTION_PREFIX}${describeEvent(selected)}`
  if (cursor !== null) return `${AT_CAPTION_PREFIX}${formatTime(cursor)}`
  return LIVE_CAPTION
}
