// Toutes les routes : welcome et logout sans clé, le reste derrière requireKey (clé ou session).
import { Router } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { PlanStore } from '../lib/planStore.ts'
import type { SavedClipsStore } from '../lib/savedClipsStore.ts'
import type { MarkersStore } from '../lib/markersStore.ts'
import type { ZonesStore } from '../lib/zonesStore.ts'
import { createRequireKey } from '../middleware/requireKey.ts'
import { createSessions } from '../middleware/session.ts'
import type { CamerasService } from '../services/camerasService.ts'
import type { EventsService } from '../services/eventsService.ts'
import type { HeatingService } from '../services/heatingService.ts'
import type { HueService } from '../services/hueService.ts'
import type { PlugService } from '../services/plugService.ts'
import type { ShuttersService } from '../services/shuttersService.ts'
import type { ShuttersAuto } from '../services/shuttersAutoService.ts'
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
import { shuttersRouter } from './shutters.ts'
import { poeRouter } from './poe.ts'
import { snapshotsRouter } from './snapshots.ts'
import { welcomeRouter } from './welcome.ts'
import { planRouter } from './plan.ts'
import { recordRouter } from './record.ts'
import { markersRouter } from './markers.ts'
import { zonesRouter } from './zones.ts'

export interface Services {
  cameras: CamerasService
  events: EventsService
  snapshots: SnapshotsService
  live: LiveService
  /** Null quand aucun pont Hue n'est configuré. */
  hue: HueService | null
  /** Null quand aucune prise connectée n'est configurée. */
  plug: PlugService | null
  /** Les volets roulants ; null sans volets configurés. */
  shutters: ShuttersService | null
  /** L'action automatique des volets (lever et coucher du soleil) ; null sans volets. */
  shuttersAuto: ShuttersAuto | null
  /** Le chauffage automatique de la prise et son journal ; null sans prise. */
  heating: HeatingService | null
  /** Null quand aucun switch n'est configuré. */
  poe: PoeService | null
  /** Null sans GUEST_KEY : /guest répond 503. */
  guest: GuestLink | null
  files: BackupFiles
  /** Les zones de surveillance du mouvement, une par caméra. */
  zones: ZonesStore
  /** Les repères de caméras posés sur l'image de chaque caméra (un 📷 par autre caméra, déplaçable). */
  markers: MarkersStore
  /** Le plan de la maison (la carte de la WebApp). */
  plan: PlanStore
  /** L'adresse de l'enregistreur (motion), ou null : /record répond 503. */
  recorderUrl: string | null
  /** La liste des clips sauvegardés (un clip enregistré à la main en fait partie d'office). */
  savedClips: SavedClipsStore
}

/** Les chemins derrière la clé ; tout le reste (welcome, logout, le certificat public, les fichiers de la WebApp) est public. */
export const SECURED_PATHS = [
  '/auth',
  '/direct',
  '/image',
  '/events',
  '/clips',
  '/snapshots',
  '/snapshot',
  '/stream',
  '/frame',
  '/audio',
  '/poe',
  '/plug',
  '/shutters',
  '/hue',
  '/guest',
  '/zones',
  '/markers',
  '/plan',
  '/record',
]

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
  router.use(plugRouter(services.plug, services.heating))
  router.use(shuttersRouter(services.shutters, services.shuttersAuto))
  router.use(hueRouter(services.hue))
  router.use(guestRouter(services.guest))
  router.use(zonesRouter(services.zones))
  router.use(markersRouter(services.markers))
  router.use(planRouter(services.plan))
  router.use(recordRouter(services.recorderUrl, services.savedClips))
  return router
}
