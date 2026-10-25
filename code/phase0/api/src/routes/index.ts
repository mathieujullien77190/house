// Toutes les routes : welcome et logout sans clé, le reste derrière requireKey (clé ou session).
import { Router } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import { createRequireKey } from '../middleware/requireKey.ts'
import type { CamerasService } from '../services/camerasService.ts'
import type { EventsService } from '../services/eventsService.ts'
import type { PoeService } from '../services/poeService.ts'
import type { LiveService } from '../services/liveService.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'
import { authRouter } from './auth.ts'
import { camerasRouter } from './cameras.ts'
import { eventsRouter } from './events.ts'
import { liveRouter } from './live.ts'
import { poeRouter } from './poe.ts'
import { snapshotsRouter } from './snapshots.ts'
import { welcomeRouter } from './welcome.ts'

export interface Services {
  cameras: CamerasService
  events: EventsService
  snapshots: SnapshotsService
  live: LiveService
  /** Null quand aucun switch n'est configuré. */
  poe: PoeService | null
  files: BackupFiles
}

/** Les chemins derrière la clé ; tout le reste (welcome, logout, les fichiers de la WebApp) est public. */
export const SECURED_PATHS = ['/auth', '/direct', '/image', '/events', '/clips', '/snapshots', '/snapshot', '/stream', '/frame', '/poe']

export const createRoutes = (apiKey: string, services: Services): Router => {
  const router = Router()
  router.use(welcomeRouter())
  router.use(SECURED_PATHS, createRequireKey(apiKey))
  router.use(authRouter())
  router.use(camerasRouter(services.cameras))
  router.use(eventsRouter(services.events, services.files))
  router.use(snapshotsRouter(services.snapshots, services.files))
  router.use(liveRouter(services.live))
  router.use(poeRouter(services.poe))
  return router
}
