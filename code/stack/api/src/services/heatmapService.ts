// La carte de chaleur d'une caméra : où l'image change d'une image gardée à la suivante. Le calcul passe par toutes les images gardées une fois, en tâche de fond (il
// garde la carte et la dernière image lue) ; à chaque demande il ne reprend que les images arrivées depuis, donc cliquer dans une heure ne recalcule que cette heure.
import { readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import jpeg from 'jpeg-js'
import { COLS, MAX_GAP_SECONDS, ROWS, THRESHOLDS, accumulate, cellChanges, downsample } from '../lib/heatmapMath.ts'
import type { Heatmap, HeatmapStore } from '../lib/heatmapStore.ts'
import type { SnapshotsRepository } from '../repositories/snapshotsRepository.ts'

/** La carte est gardée sur le disque toutes les `SAVE_EVERY` images traitées (et à la fin). */
export const SAVE_EVERY = 100
/** Au plus ce nombre d'images par passage. */
export const MAX_BATCH = 50000

export interface HeatmapStatus {
  cols: number
  rows: number
  thresholds: number[]
  /** Le nombre de paires d'images comparées jusqu'ici. */
  pairs: number
  /** Le calcul tourne : la carte grandit encore. */
  computing: boolean
  /** Les images traitées dans ce passage et le nombre à traiter. */
  done: number
  total: number
  /** Un compteur par seuil, des Uint16 petit-boutistes en base64 : `cols × rows` valeurs chacun. */
  levels: string[]
}

export interface HeatmapOptions {
  snapshots: SnapshotsRepository
  store: HeatmapStore
  /** Le disque backup (les chemins des images sont relatifs à lui). */
  dataDir: string
  /** Décode un JPEG en RGBA ; le vrai (`jpeg-js`) par défaut, remplaçable dans les tests. */
  decode?: (file: Uint8Array) => { data: Uint8Array; width: number; height: number }
  /** Laisse la main au reste de l'API entre deux images ; `setImmediate` par défaut. */
  yieldNow?: () => Promise<void>
}

interface Job {
  heat: Heatmap
  running: boolean
  done: number
  total: number
}

export const createHeatmapService = ({
  snapshots,
  store,
  dataDir,
  decode = (file) => jpeg.decode(file, { useTArray: true }),
  yieldNow = () => new Promise<void>((done) => setImmediate(done)),
}: HeatmapOptions) => {
  const jobs = new Map<string, Job>()

  const frameOf = (path: string): Uint8Array | null => {
    const file = resolve(dataDir, path)
    if (!file.startsWith(dataDir + sep)) return null
    try {
      const { data, width, height } = decode(readFileSync(file))
      return downsample(data, width, height)
    } catch {
      // Image vide ou abîmée (écrite à moitié) : elle est sautée.
      return null
    }
  }

  const run = async (camera: string, job: Job): Promise<void> => {
    const list = snapshots.after(camera, job.heat.upTo, MAX_BATCH)
    job.done = 0
    job.total = list.length
    job.running = true
    try {
      for (const shot of list) {
        const frame = frameOf(shot.path)
        const heat = job.heat
        if (frame) {
          if (heat.frame && shot.taken_at - heat.frameAt <= MAX_GAP_SECONDS) {
            const changes = cellChanges(heat.frame, frame)
            if (changes) {
              accumulate(heat.counts, changes)
              heat.pairs++
            }
          }
          heat.frame = frame
          heat.frameAt = shot.taken_at
        }
        heat.upTo = shot.taken_at
        job.done++
        if (job.done % SAVE_EVERY === 0) store.write(camera, heat)
        await yieldNow()
      }
    } finally {
      store.write(camera, job.heat)
      job.running = false
    }
  }

  return {
    /** La carte telle qu'elle est, et reprend le calcul des images arrivées depuis (en tâche de fond : l'état se relit tant que `computing`). */
    status: (camera: string): HeatmapStatus => {
      let job = jobs.get(camera)
      if (!job) {
        job = { heat: store.read(camera), running: false, done: 0, total: 0 }
        jobs.set(camera, job)
      }
      if (!job.running) void run(camera, job).catch(() => undefined)
      return {
        cols: COLS,
        rows: ROWS,
        thresholds: THRESHOLDS,
        pairs: job.heat.pairs,
        computing: job.running,
        done: job.done,
        total: job.total,
        levels: job.heat.counts.map((level) => Buffer.from(level.buffer, level.byteOffset, level.byteLength).toString('base64')),
      }
    },
  }
}

export type HeatmapService = ReturnType<typeof createHeatmapService>
