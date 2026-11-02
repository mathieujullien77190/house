// Les événements copiés par House Sync.
import type { Database } from '../db/database.ts'
import type { EventRow } from '../types.ts'

export const createEventsRepository = (db: Database) => ({
  /** Les plus récents d'abord, au plus `limit`. */
  latest: (limit: number): EventRow[] => db.all<EventRow>('SELECT * FROM events ORDER BY started_at DESC LIMIT ?', limit),
  /**
   * Les événements qui touchent [from, to] (secondes), plus récents d'abord, au plus `limit` ; from, to et camera sont
   * facultatifs. Un événement en cours touche toute fenêtre qui finit après son début.
   */
  between: (query: { camera?: string; from?: number; to?: number }, limit: number): EventRow[] =>
    db.all<EventRow>(
      'SELECT * FROM events WHERE (? = \'\' OR camera = ?) AND (? = 0 OR COALESCE(ended_at, 9007199254740991) >= ?) AND (? = 0 OR started_at <= ?) ORDER BY started_at DESC LIMIT ?',
      query.camera ?? '',
      query.camera ?? '',
      query.from === undefined ? 0 : 1,
      query.from ?? 0,
      query.to === undefined ? 0 : 1,
      query.to ?? 0,
      limit,
    ),
  /** Le dernier événement de chaque caméra. */
  lastPerCamera: (): EventRow[] =>
    db.all<EventRow>(
      'SELECT * FROM events WHERE started_at = (SELECT MAX(started_at) FROM events e WHERE e.camera = events.camera) ORDER BY camera',
    ),
  clipPath: (id: string): string | null => db.get<{ clip_path: string | null }>('SELECT clip_path FROM events WHERE id = ?', id)?.clip_path ?? null,
})

export type EventsRepository = ReturnType<typeof createEventsRepository>
