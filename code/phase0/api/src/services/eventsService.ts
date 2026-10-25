// Les événements : les lignes de la base deviennent des réponses (le chemin du clip devient un service).
import type { EventsRepository } from '../repositories/eventsRepository.ts'
import type { EventDto, EventRow } from '../types.ts'

export const MAX_EVENTS = 200

const toDto = (row: EventRow): EventDto => ({
  id: row.id,
  camera: row.camera,
  label: row.label,
  started_at: row.started_at,
  ended_at: row.ended_at,
  clip: row.clip_path ? `/clips/${row.id}` : null,
})

export const createEventsService = (events: EventsRepository) => ({
  /** Les 200 derniers, ou le dernier de chaque caméra. */
  list: (lastOnly: boolean): EventDto[] => (lastOnly ? events.lastPerCamera() : events.latest(MAX_EVENTS)).map(toDto),
  /** Le chemin du clip d'un événement sur le disque backup, ou null. */
  clipPath: (id: string): string | null => events.clipPath(id),
})

export type EventsService = ReturnType<typeof createEventsService>
