// Une image par caméra toutes les SNAPSHOT_INTERVAL_SECONDS, dans snapshots/<caméra>/<horodatage>.jpg,
// puis le ménage des images plus vieilles que SNAPSHOT_RETENTION_DAYS (fichiers et lignes).
// L'enregistreur n'enregistre que sur mouvement : entre deux événements, il ne reste rien. House Sync garde donc
// une image par minute et par caméra (image du flux principal, 720 px de haut) pendant quelques jours.
import { mkdirSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import { seconds, type Context } from './context.ts'
import type { Recorder } from './recorder.ts'

const SNAPSHOT_HEIGHT = 720

export const createSnapshots = (ctx: Context, rec: Recorder) => {
  const { db, config, settings } = ctx
  const insertSnapshot = db.prepare('INSERT OR IGNORE INTO snapshots (camera, taken_at, path) VALUES (?, ?, ?)')
  const oldSnapshots = db.prepare('SELECT camera, taken_at, path FROM snapshots WHERE taken_at < ?')
  const deleteSnapshot = db.prepare('DELETE FROM snapshots WHERE camera = ? AND taken_at = ?')
  const lastSnapshotAt = new Map<string, number>()
  let lastCleanAt = 0

  return async (cameras: string[]): Promise<number> => {
    const now = seconds(ctx)
    let taken = 0
    for (const camera of cameras) {
      // Chaque caméra a son rythme (réglé depuis la page).
      if (now - (lastSnapshotAt.get(camera) ?? 0) < settings.cameraSettings(camera).snapshot_seconds) continue
      lastSnapshotAt.set(camera, now)
      // Une caméra qui ne répond pas ne doit pas priver les autres de leur image.
      const image = await rec.recorder(camera, `/api/${camera}/latest.jpg?h=${SNAPSHOT_HEIGHT}`)
        .then(async (res) => (res.ok ? Buffer.from(await res.arrayBuffer()) : null))
        .catch(() => null)
      if (!image) continue
      mkdirSync(`${config.dataDir}/snapshots/${camera}`, { recursive: true })
      const path = `snapshots/${camera}/${now}.jpg`
      await writeFile(`${config.dataDir}/${path}`, image)
      insertSnapshot.run(camera, now, path)
      taken += 1
    }
    if (now - lastCleanAt < 60) return taken
    lastCleanAt = now
    const limit = now - config.snapshotRetentionDays * 86400
    for (const row of oldSnapshots.all(limit) as { camera: string; taken_at: number; path: string }[]) {
      await unlink(`${config.dataDir}/${row.path}`).catch(() => undefined)
      deleteSnapshot.run(row.camera, row.taken_at)
    }
    return taken
  }
}
