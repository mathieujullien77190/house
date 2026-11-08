import type { EventRow } from '@/types'
import { clipDurationOf } from './clipDurations'

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }

export const formatTime = (seconds: number): string => new Date(seconds * 1000).toLocaleString('fr-FR', DATE_FORMAT)

export const ONGOING_TEXT = 'en cours'

/** Durée du clip d'un événement, en secondes entières, quand sa vidéo a été lue ; « en cours » tant que l'événement dure ; sinon rien. */
export const formatDuration = (event: EventRow): string => {
  if (event.ended_at === null) return ONGOING_TEXT
  const seconds = clipDurationOf(event.id)
  return seconds === null ? '' : `${Math.max(1, Math.round(seconds))} s`
}

/** Libellé lisible : « person · 25/10/2026 14:51 · 15 s » : le début et la durée du **clip** (pas du mouvement). */
export const describeEvent = (event: EventRow): string =>
  [event.label, formatTime(event.clip_started_at ?? event.started_at), formatDuration(event)].filter(Boolean).join(' · ')
