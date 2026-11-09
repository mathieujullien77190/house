// Les adresses de chaque caméra (direct et dernière image), écrites par House Sync.
import type { Database } from '../db/database.ts'
import type { CameraRow } from '../types.ts'

export const createCamerasRepository = (db: Database) => ({
  // L'orientation vient des réglages de House Sync (paysage tant que rien n'est réglé).
  liveStreams: (): CameraRow[] =>
    db.all<CameraRow>(
      "SELECT l.camera, l.url, CASE s.orientation WHEN 'portrait' THEN 'portrait' ELSE 'landscape' END AS orientation, CASE s.rain_now WHEN 'rain' THEN 'rain' WHEN 'heavy' THEN 'heavy' ELSE 'off' END AS rain FROM live_streams l LEFT JOIN settings s ON s.camera = l.camera ORDER BY l.camera",
    ),
  lastImages: (): CameraRow[] => db.all<CameraRow>('SELECT camera, url FROM last_images ORDER BY camera'),
})

export type CamerasRepository = ReturnType<typeof createCamerasRepository>
