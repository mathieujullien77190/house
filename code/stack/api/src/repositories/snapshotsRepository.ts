// Les images par minute gardées par House Sync.
import type { Database } from '../db/database.ts'

export const createSnapshotsRepository = (db: Database) => ({
  /** Les instants (secondes) où une image existe, du plus ancien au plus récent. */
  times: (camera: string, from: number, to: number, limit: number): number[] =>
    db
      .all<{ taken_at: number }>('SELECT taken_at FROM snapshots WHERE camera = ? AND taken_at BETWEEN ? AND ? ORDER BY taken_at LIMIT ?', camera, from, to, limit)
      .map((row) => row.taken_at),
  /** L'image la plus proche d'un instant, dans une tolérance : son chemin et son instant (son identifiant). */
  nearest: (camera: string, at: number, tolerance: number): { path: string; taken_at: number } | null =>
    db.get<{ path: string; taken_at: number }>(
      'SELECT path, taken_at FROM snapshots WHERE camera = ? AND taken_at BETWEEN ? AND ? ORDER BY ABS(taken_at - ?) LIMIT 1',
      camera,
      at - tolerance,
      at + tolerance,
      at,
    ) ?? null,
})

export type SnapshotsRepository = ReturnType<typeof createSnapshotsRepository>
