// Les événements copiés par House Sync.
import type { Database } from '../db/database.ts'
import type { EventRow } from '../types.ts'

export const createEventsRepository = (db: Database) => ({
  /** Les plus récents d'abord, au plus `limit`. */
  latest: (limit: number): EventRow[] => db.all<EventRow>('SELECT * FROM events ORDER BY started_at DESC LIMIT ?', limit),
  /** Le dernier événement de chaque caméra. */
  lastPerCamera: (): EventRow[] =>
    db.all<EventRow>(
      'SELECT * FROM events WHERE started_at = (SELECT MAX(started_at) FROM events e WHERE e.camera = events.camera) ORDER BY camera',
    ),
  clipPath: (id: string): string | null => db.get<{ clip_path: string | null }>('SELECT clip_path FROM events WHERE id = ?', id)?.clip_path ?? null,
})

export type EventsRepository = ReturnType<typeof createEventsRepository>
