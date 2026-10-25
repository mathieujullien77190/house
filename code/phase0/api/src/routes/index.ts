// Toutes les routes : welcome sans clé, le reste derrière requireKey.
import { Router } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import { createRequireKey } from '../middleware/requireKey.ts'
import type { CamerasService } from '../services/camerasService.ts'
import type { EventsService } from '../services/eventsService.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'
import { authRouter } from './auth.ts'
import { camerasRouter } from './cameras.ts'
import { eventsRouter } from './events.ts'
import { snapshotsRouter } from './snapshots.ts'
import { welcomeRouter } from './welcome.ts'

export interface Services {
  cameras: CamerasService
  events: EventsService
  snapshots: SnapshotsService
  files: BackupFiles
}

/** Les chemins derrière la clé ; tout le reste (welcome, les fichiers de la WebApp) est public. */
export const SECURED_PATHS = ['/auth', '/direct', '/image', '/events', '/clips', '/snapshots', '/snapshot']

export const createRoutes = (apiKey: string, services: Services): Router => {
  const router = Router()
  router.use(welcomeRouter())
  router.use(SECURED_PATHS, createRequireKey(apiKey))
  router.use(authRouter())
  router.use(camerasRouter(services.cameras))
  router.use(eventsRouter(services.events, services.files))
  router.use(snapshotsRouter(services.snapshots, services.files))
  return router
}
