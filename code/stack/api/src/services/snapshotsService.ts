// Les images par minute : les instants couverts et l'image la plus proche d'un instant.
import type { SnapshotsRepository } from '../repositories/snapshotsRepository.ts'

export const MAX_SNAPSHOT_TIMES = 20000
/** Une image « à cet instant » peut dater d'au plus cinq minutes avant ou après (le plus grand intervalle d’image réglable). */
export const SNAPSHOT_TOLERANCE = 300

export const createSnapshotsService = (snapshots: SnapshotsRepository) => ({
  times: (camera: string, from: number, to: number): number[] => snapshots.times(camera, from, to, MAX_SNAPSHOT_TIMES),
  nearest: (camera: string, at: number): { path: string; taken_at: number; code: string } | null => snapshots.nearest(camera, Math.floor(at), SNAPSHOT_TOLERANCE),
})

export type SnapshotsService = ReturnType<typeof createSnapshotsService>
