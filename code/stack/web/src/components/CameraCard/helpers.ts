import { describeEvent, formatTime } from '@/lib/format'
import type { SpecItem } from '@house/ui'
import type { EventRow, HueSensor } from '@/types'
import type { Quality } from './types'
import {
  AT_CAPTION_PREFIX,
  CLIP_CAPTION_PREFIX,
  CLIP_MAX_LEAD_SECONDS,
  LIVE_CAPTION,
  LIVE_FORMAT,
  TEMPERATURE_LABEL,
  TEMPERATURE_UNKNOWN_TEXT,
} from './constants'

/** Une ligne par capteur demandé, dans l'ordre des identifiants : « Température · <nom du capteur> » et sa valeur. Un capteur absent du pont n'a pas de ligne. */
export const temperatureItems = (sensors: HueSensor[], ids: string[]): SpecItem[] =>
  ids.flatMap((id) => {
    const sensor = sensors.find((found) => found.id === id)
    if (!sensor) return []
    const value = sensor.temperature === null ? TEMPERATURE_UNKNOWN_TEXT : `${sensor.temperature.toFixed(1).replace('.', ',')} °C`
    return [{ id, label: `${TEMPERATURE_LABEL}${sensor.name}`, value }]
  })

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

/** L'adresse du clip à lire : la copie H.264 si on la demande et qu'elle existe, sinon l'original. */
export const clipPathOf = (event: EventRow, quality: Quality): string | null =>
  quality === 'h264' && event.clip_h264 ? event.clip_h264 : event.clip

/** « Direct · MJPEG · 640×360 » : le type du flux et, une fois la première image reçue, sa résolution. */
export const liveCaption = (size: { width: number; height: number } | null): string =>
  [LIVE_CAPTION, LIVE_FORMAT, size ? `${size.width}×${size.height}` : ''].filter(Boolean).join(' · ')

export const captionOf = (cursor: number | null, selected: EventRow | null, live: string): string => {
  if (selected) return selected.ended_at === null ? describeEvent(selected) : `${CLIP_CAPTION_PREFIX}${describeEvent(selected)}`
  if (cursor !== null) return `${AT_CAPTION_PREFIX}${formatTime(cursor)}`
  return live
}
