// Les adresses de chaque caméra (direct et dernière image), écrites par House Sync.
import type { Database } from '../db/database.ts'
import type { CameraRow } from '../types.ts'

export const createCamerasRepository = (db: Database) => ({
  liveStreams: (): CameraRow[] => db.all<CameraRow>('SELECT camera, url FROM live_streams ORDER BY camera'),
  lastImages: (): CameraRow[] => db.all<CameraRow>('SELECT camera, url FROM last_images ORDER BY camera'),
})

export type CamerasRepository = ReturnType<typeof createCamerasRepository>
