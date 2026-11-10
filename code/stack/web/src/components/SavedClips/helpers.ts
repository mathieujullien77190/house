import { formatTime } from '@/lib/format'
import type { EventRow } from '@/types'

/** Le clip qu'on lit : la copie légère (lisible partout) si elle existe, sinon l'original. */
export const playablePath = (event: EventRow): string | null => event.clip_h264 ?? event.clip

/** La légende d'une vignette : le jour et l'heure, et la durée du clip (connue quand sa vidéo est chargée). */
export const captionOf = (event: EventRow, clipSeconds?: number): string =>
  [formatTime(event.clip_started_at ?? event.started_at), clipSeconds === undefined ? '' : `${Math.round(clipSeconds)} s`].filter(Boolean).join(' · ')
