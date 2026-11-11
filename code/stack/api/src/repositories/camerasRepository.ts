// Les adresses de chaque caméra (direct et dernière image), écrites par House Sync.
import type { Database } from '../db/database.ts'
import { cameraOrderSql } from '../lib/cameraOrder.ts'
import type { CameraRow } from '../types.ts'

export const createCamerasRepository = (db: Database) => ({
  // L'orientation, la pluie et les yeux qui brillent (vrai quand la recherche tourne) viennent des réglages de House Sync (paysage, pas de pluie et pas d'yeux tant que rien n'est réglé).
  liveStreams: (): CameraRow[] =>
    db
      .all<Omit<CameraRow, 'eyes'> & { eyes: number }>(
        `SELECT l.camera, l.url, CASE s.orientation WHEN 'portrait' THEN 'portrait' ELSE 'landscape' END AS orientation, CASE s.rain_now WHEN 'rain' THEN 'rain' WHEN 'heavy' THEN 'heavy' ELSE 'off' END AS rain, CASE s.eyes_now WHEN 1 THEN 1 ELSE 0 END AS eyes FROM live_streams l LEFT JOIN settings s ON s.camera = l.camera ORDER BY ${cameraOrderSql('l.camera')}`,
      )
      .map((row) => ({ ...row, eyes: row.eyes === 1 })),
  lastImages: (): CameraRow[] => db.all<CameraRow>(`SELECT camera, url FROM last_images ORDER BY ${cameraOrderSql()}`),
})

export type CamerasRepository = ReturnType<typeof createCamerasRepository>
