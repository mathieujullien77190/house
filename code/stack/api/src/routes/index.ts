// Toutes les routes : welcome et logout sans clé, le reste derrière requireKey (clé ou session).
import { Router } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import { createRequireKey } from '../middleware/requireKey.ts'
import { createSessions } from '../middleware/session.ts'
import type { CamerasService } from '../services/camerasService.ts'
import type { EventsService } from '../services/eventsService.ts'
import type { HueService } from '../services/hueService.ts'
import type { PlugService } from '../services/plugService.ts'
import type { PoeService } from '../services/poeService.ts'
import type { LiveService } from '../services/liveService.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'
import { authRouter } from './auth.ts'
import { camerasRouter } from './cameras.ts'
import { caRouter } from './ca.ts'
import { eventsRouter } from './events.ts'
import { guestRouter, type GuestLink } from './guest.ts'
import { hueRouter } from './hue.ts'
import { liveRouter } from './live.ts'
import { plugRouter } from './plug.ts'
import { poeRouter } from './poe.ts'
import { snapshotsRouter } from './snapshots.ts'
import { welcomeRouter } from './welcome.ts'

export interface Services {
  cameras: CamerasService
  events: EventsService
  snapshots: SnapshotsService
  live: LiveService
  /** Null quand aucun pont Hue n'est configuré. */
  hue: HueService | null
  /** Null quand aucune prise connectée n'est configurée. */
  plug: PlugService | null
  /** Null quand aucun switch n'est configuré. */
  poe: PoeService | null
  /** Null sans GUEST_KEY : /guest répond 503. */
  guest: GuestLink | null
  files: BackupFiles
}

/** Les chemins derrière la clé ; tout le reste (welcome, logout, le certificat public, les fichiers de la WebApp) est public. */
export const SECURED_PATHS = ['/auth', '/direct', '/image', '/events', '/clips', '/snapshots', '/snapshot', '/stream', '/frame', '/poe', '/plug', '/hue', '/guest']

export const createRoutes = (apiKey: string, services: Services, caCert = ''): Router => {
  const router = Router()
  router.use(welcomeRouter())
  router.use(caRouter(caCert))
  const sessions = createSessions(apiKey)
  router.use(SECURED_PATHS, createRequireKey(apiKey, sessions))
  router.use(authRouter(sessions))
  router.use(camerasRouter(services.cameras))
  router.use(eventsRouter(services.events, services.files))
  router.use(snapshotsRouter(services.snapshots, services.files))
  router.use(liveRouter(services.live))
  router.use(poeRouter(services.poe))
  router.use(plugRouter(services.plug))
  router.use(hueRouter(services.hue))
  router.use(guestRouter(services.guest))
  return router
}
