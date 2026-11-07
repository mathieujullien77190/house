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
  /** Les événements de ces identifiants, plus récents d'abord (ceux qui n'existent plus sont ignorés). */
  byIds: (ids: string[]): EventRow[] =>
    ids.length === 0 ? [] : db.all<EventRow>(`SELECT * FROM events WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY started_at DESC`, ...ids),
  /** Le dernier événement de chaque caméra. */
  lastPerCamera: (): EventRow[] =>
    db.all<EventRow>(
      'SELECT * FROM events WHERE started_at = (SELECT MAX(started_at) FROM events e WHERE e.camera = events.camera) ORDER BY camera',
    ),
  clipPath: (id: string, h264 = false): string | null =>
    db.get<{ path: string | null }>(`SELECT ${h264 ? 'clip_web_path' : 'clip_path'} AS path FROM events WHERE id = ?`, id)?.path ?? null,
})

export type EventsRepository = ReturnType<typeof createEventsRepository>
