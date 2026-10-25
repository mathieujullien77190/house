// Les événements : les lignes de la base deviennent des réponses (le chemin du clip devient un service).
import type { EventsRepository } from '../repositories/eventsRepository.ts'
import type { EventDto, EventRow } from '../types.ts'

export const MAX_EVENTS = 200
/** Avec une fenêtre (from, to), le client peut demander jusqu'à ce nombre d'événements. */
export const MAX_WINDOW_EVENTS = 1000

export interface EventsQuery {
  lastOnly: boolean
  camera?: string
  from?: number
  to?: number
  limit?: number
}

const toDto = (row: EventRow): EventDto => ({
  id: row.id,
  camera: row.camera,
  label: row.label,
  started_at: row.started_at,
  ended_at: row.ended_at,
  clip: row.clip_path ? `/clips/${row.id}` : null,
  clip_started_at: row.clip_started_at,
})

export const createEventsService = (events: EventsRepository) => ({
  /**
   * Le dernier de chaque caméra (lastOnly) ; sinon, avec from, to ou camera, les événements qui touchent la fenêtre
   * (au plus 1000, `limit` pour moins) ; sinon les 200 derniers.
   */
  list: (query: EventsQuery): EventDto[] => {
    if (query.lastOnly) return events.lastPerCamera().map(toDto)
    const filtered = query.camera !== undefined || query.from !== undefined || query.to !== undefined
    if (!filtered) return events.latest(MAX_EVENTS).map(toDto)
    const limit = Math.min(MAX_WINDOW_EVENTS, Math.max(1, query.limit ?? MAX_WINDOW_EVENTS))
    return events.between({ camera: query.camera, from: query.from, to: query.to }, limit).map(toDto)
  },
  /** Le chemin du clip d'un événement sur le disque backup, ou null. */
  clipPath: (id: string): string | null => events.clipPath(id),
})

export type EventsService = ReturnType<typeof createEventsService>
