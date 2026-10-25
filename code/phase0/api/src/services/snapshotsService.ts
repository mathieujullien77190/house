// Les images par minute : les instants couverts et l'image la plus proche d'un instant.
import type { SnapshotsRepository } from '../repositories/snapshotsRepository.ts'

export const MAX_SNAPSHOT_TIMES = 20000
/** Une image « à cet instant » peut dater d'au plus deux minutes avant ou après. */
export const SNAPSHOT_TOLERANCE = 120

export const createSnapshotsService = (snapshots: SnapshotsRepository) => ({
  times: (camera: string, from: number, to: number): number[] => snapshots.times(camera, from, to, MAX_SNAPSHOT_TIMES),
  nearestPath: (camera: string, at: number): string | null => snapshots.nearestPath(camera, Math.floor(at), SNAPSHOT_TOLERANCE),
})

export type SnapshotsService = ReturnType<typeof createSnapshotsService>
