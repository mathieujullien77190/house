// Les adresses de chaque caméra (direct et dernière image), écrites par House Sync.
import type { Database } from '../db/database.ts'
import { cameraOrderSql } from '../lib/cameraOrder.ts'
import type { CameraRow } from '../types.ts'

export const createCamerasRepository = (db: Database) => ({
  // L'orientation, la pluie et la recherche des yeux (1 : en route) viennent des réglages de House Sync (paysage et pas de pluie tant que rien n'est réglé).
  liveStreams: (): CameraRow[] =>
    db
      .all<CameraRow>(
        `SELECT l.camera, l.url, CASE s.orientation WHEN 'portrait' THEN 'portrait' ELSE 'landscape' END AS orientation, CASE s.rain_now WHEN 'rain' THEN 'rain' WHEN 'heavy' THEN 'heavy' WHEN 'fog' THEN 'fog' WHEN 'wind' THEN 'wind' ELSE 'off' END AS rain, COALESCE(s.eyes_now, 0) AS eyes FROM live_streams l LEFT JOIN settings s ON s.camera = l.camera ORDER BY ${cameraOrderSql('l.camera')}`,
      ),
  lastImages: (): CameraRow[] => db.all<CameraRow>(`SELECT camera, url FROM last_images ORDER BY ${cameraOrderSql()}`),
})

export type CamerasRepository = ReturnType<typeof createCamerasRepository>
