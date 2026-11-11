// Une image par caméra toutes les SNAPSHOT_INTERVAL_SECONDS, dans snapshots/<caméra>/<horodatage>.jpg,
// puis (`purgeSnapshots`, appelé par le ménage quotidien de clips.ts) le ménage des images plus vieilles que la durée de garde (fichiers et lignes).
// L'enregistreur n'enregistre que sur mouvement : entre deux événements, il ne reste rien. House Sync garde donc
// une image par minute et par caméra (image du flux principal, 720 px de haut) pendant la durée de garde.
import { mkdirSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import { seconds, type Context } from './context.ts'
import { createEyes } from './eyes.ts'
import type { Recorder } from './recorder.ts'
import { insertSnapshot } from './snapshotCodes.ts'

const SNAPSHOT_HEIGHT = 720

/** Supprime les images plus vieilles que `limit` (secondes depuis 1970) : fichier puis ligne. Rend leur nombre. */
export const purgeSnapshots = async (ctx: Context, limit: number): Promise<number> => {
  const { db, config } = ctx
  // Les détections d'yeux (`eye_detections`) ont la même durée de garde que leur image : la ligne et l'image partent ensemble.
  db.prepare('DELETE FROM eye_detections WHERE taken_at < ?').run(limit)
  const rows = db.prepare('SELECT camera, taken_at, path FROM snapshots WHERE taken_at < ?').all(limit) as { camera: string; taken_at: number; path: string }[]
  const remove = db.prepare('DELETE FROM snapshots WHERE camera = ? AND taken_at = ?')
  for (const row of rows) {
    await unlink(`${config.dataDir}/${row.path}`).catch(() => undefined)
    remove.run(row.camera, row.taken_at)
  }
  return rows.length
}

export const createSnapshots = (ctx: Context, rec: Recorder) => {
  const { db, config, settings } = ctx
  const eyes = createEyes(ctx, rec)
  const lastSnapshotAt = new Map<string, number>()
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
        insertSnapshot(db, camera, takenAt, path)
        await eyes.look(camera, takenAt, path, image)
        return 1
      }),
    )
    return results.reduce((sum, n) => sum + n, 0)
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
