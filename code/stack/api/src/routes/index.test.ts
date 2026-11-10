import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { PlanStore } from '../lib/planStore.ts'
import type { SavedClipsStore } from '../lib/savedClipsStore.ts'
import type { MarkersStore } from '../lib/markersStore.ts'
import type { ZonesStore } from '../lib/zonesStore.ts'
import type { CamerasService } from '../services/camerasService.ts'
import type { EventsService } from '../services/eventsService.ts'
import type { LiveService } from '../services/liveService.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { createRoutes, SECURED_PATHS, type Services } from './index.ts'

const KEY = 'une-cle-assez-longue'

const services: Services = {
  cameras: { liveStreams: () => [], lastImages: () => [] } as unknown as CamerasService,
  events: {} as EventsService,
  snapshots: {} as SnapshotsService,
  live: {} as LiveService,
  hue: null,
  plug: null,
  shutters: null,
  shuttersAuto: null,
  heating: null,
  poe: null,
  guest: null,
  files: {} as BackupFiles,
  zones: { get: () => ({}) } as unknown as ZonesStore,
  markers: { get: () => ({}) } as unknown as MarkersStore,
  plan: { get: () => null } as unknown as PlanStore,
  recorderUrl: null,
  savedClips: {} as SavedClipsStore,
}

test('les chemins protégés exigent la clé, welcome et logout non', async () => {
  // les faux services vides font échouer certaines routes une fois la clé donnée : seul le 401 compte ici
  const log = mock.method(console, 'error', () => undefined)
  await withServer(routerApp(createRoutes(KEY, services)), async (url) => {
    assert.equal((await call(`${url}/welcome`)).status, 200)
    assert.equal((await call(`${url}/logout`)).status, 200)
    // pas de certificat configuré
    assert.equal((await call(`${url}/rootCA.crt`)).status, 404)
    for (const path of SECURED_PATHS) {
      assert.equal((await call(`${url}${path}`)).status, 401, path)
      assert.notEqual((await call(`${url}${path}`, 'GET', undefined, { 'X-House-Key': KEY })).status, 401, path)
    }
  }).finally(() => log.mock.restore())
})
