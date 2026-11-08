// Les événements : les lignes de la base deviennent des réponses (le chemin du clip devient un service).
import type { SavedClipsStore } from '../lib/savedClipsStore.ts'
import type { EventsRepository } from '../repositories/eventsRepository.ts'
import type { EventDto, EventRow } from '../types.ts'

export const MAX_EVENTS = 200
/** Avec une fenêtre (from, to), le client peut demander jusqu'à ce nombre d'événements. */
export const MAX_WINDOW_EVENTS = 1000

export interface EventsQuery {
  lastOnly: boolean
  /** Seulement les clips sauvegardés (les plus récents d'abord). */
  savedOnly?: boolean
  camera?: string
  from?: number
  to?: number
  limit?: number
}

const toDto = (row: EventRow, saved: ReadonlySet<string>): EventDto => ({
  id: row.id,
  camera: row.camera,
  label: row.label,
  started_at: row.started_at,
  ended_at: row.ended_at,
  clip: row.clip_path ? `/clips/${row.id}` : null,
  clip_h264: row.clip_web_path ? `/clips/${row.id}/h264` : null,
  clip_audio: row.clip_audio_path ? `/clips/${row.id}/audio` : null,
  clip_started_at: row.clip_started_at,
  saved: saved.has(row.id),
  orientation: row.orientation === 'portrait' ? 'portrait' : 'landscape',
})

export const createEventsService = (events: EventsRepository, savedClips: SavedClipsStore) => ({
  /**
   * Le dernier de chaque caméra (lastOnly) ; sinon, avec from, to ou camera, les événements qui touchent la fenêtre
   * (au plus 1000, `limit` pour moins) ; sinon les 200 derniers.
   */
  list: (query: EventsQuery): EventDto[] => {
    const saved = savedClips.ids()
    if (query.savedOnly) return events.byIds([...saved]).slice(0, MAX_WINDOW_EVENTS).map((row) => toDto(row, saved))
    if (query.lastOnly) return events.lastPerCamera().map((row) => toDto(row, saved))
    const filtered = query.camera !== undefined || query.from !== undefined || query.to !== undefined
    if (!filtered) return events.latest(MAX_EVENTS).map((row) => toDto(row, saved))
    const limit = Math.min(MAX_WINDOW_EVENTS, Math.max(1, query.limit ?? MAX_WINDOW_EVENTS))
    return events.between({ camera: query.camera, from: query.from, to: query.to }, limit).map((row) => toDto(row, saved))
  },
  /** Le chemin du clip d'un événement sur le disque backup (l'original, ou la copie H.264 avec `h264`), ou null. */
  clipPath: (id: string, h264 = false): string | null => events.clipPath(id, h264),
  clipAudioPath: (id: string): string | null => events.clipAudioPath(id),
  /** Sauvegarde (à garder pour toujours) ou libère le clip d'un événement ; false s'il n'a pas de clip (inconnu, ou déjà effacé). */
  setSaved: (id: string, saved: boolean): boolean => {
    if (!events.clipPath(id)) return false
    savedClips.set(id, saved)
    return true
  },
})

export type EventsService = ReturnType<typeof createEventsService>
