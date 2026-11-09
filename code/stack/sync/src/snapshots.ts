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
  // Les caméras du dernier tour de polling, pour le minuteur rapide (`again`) qui prend les images toutes les 5, 10 ou 15 s entre deux tours (30 s).
  let known: string[] = []
  let running = false

  const take = async (cameras: string[]): Promise<number> => {
    known = cameras
    const now = seconds(ctx)
    // Chaque caméra a son rythme (réglé depuis la page). L'image est la **prochaine image clé** du flux (go2rtc l'attend : environ 2 s) : les caméras sont prises
    // en parallèle (sinon trois caméras feraient 6 s par tour), et l'image est datée de son arrivée, pas de la demande.
    const due = cameras.filter((camera) => now - (lastSnapshotAt.get(camera) ?? 0) >= settings.effectiveSettings(camera).snapshot_seconds)
    for (const camera of due) lastSnapshotAt.set(camera, now)
    const results = await Promise.all(
      due.map(async (camera): Promise<number> => {
        // Une caméra qui ne répond pas ne doit pas priver les autres de leur image.
        const image = await rec.recorder(camera, `/api/${camera}/latest.jpg?h=${SNAPSHOT_HEIGHT}`)
          .then(async (res) => (res.ok ? Buffer.from(await res.arrayBuffer()) : null))
          .catch(() => null)
        if (!image) return 0
        const takenAt = seconds(ctx)
        mkdirSync(`${config.dataDir}/snapshots/${camera}`, { recursive: true })
        const path = `snapshots/${camera}/${takenAt}.jpg`
        await writeFile(`${config.dataDir}/${path}`, image)
        insertSnapshot.run(camera, takenAt, path)
        return 1
      }),
    )
    const taken = results.reduce((sum, n) => sum + n, 0)
    if (now - lastCleanAt < 60) return taken
    lastCleanAt = now
    const limit = now - config.snapshotRetentionDays * 86400
    for (const row of oldSnapshots.all(limit) as { camera: string; taken_at: number; path: string }[]) {
      await unlink(`${config.dataDir}/${row.path}`).catch(() => undefined)
      deleteSnapshot.run(row.camera, row.taken_at)
    }
    return taken
  }
  /** Un tour de plus, entre deux tours de polling : seules les caméras dont l'image est due en prennent une. Jamais deux à la fois. */
  const again = async (): Promise<number> => {
    if (running || known.length === 0) return 0
    running = true
    try {
      return await take(known)
    } finally {
      running = false
    }
  }
  return Object.assign(take, { again })
}
