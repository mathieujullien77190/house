import type { EventRow } from '@/types'

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }

export const formatTime = (seconds: number): string => new Date(seconds * 1000).toLocaleString('fr-FR', DATE_FORMAT)

export const ONGOING_TEXT = 'en cours'

/** Durée d'un événement, en secondes entières ; « en cours » s'il n'est pas terminé. */
export const formatDuration = (event: EventRow): string =>
  event.ended_at === null ? ONGOING_TEXT : `${Math.max(1, event.ended_at - event.started_at)} s`

/** Libellé lisible : « person · 25/10/2026 14:51 · 15 s ». */
export const describeEvent = (event: EventRow): string =>
  [event.label, formatTime(event.started_at), formatDuration(event)].filter(Boolean).join(' · ')

/** L'origine (scheme + hôte + port) d'une adresse, pour le lien vers Frigate ; vide si l'adresse est invalide. */
export const originOf = (url: string | null): string => {
  if (!url) return ''
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}
