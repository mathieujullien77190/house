import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { PlanStore } from '../lib/planStore.ts'
import type { SavedClipsStore } from '../lib/savedClipsStore.ts'
import type { MarkersStore } from '../lib/markersStore.ts'
import type { ZonesStore } from '../lib/zonesStore.ts'
import { createRoutes, SECURED_PATHS, type Services } from '../routes/index.ts'
import type { CamerasService } from '../services/camerasService.ts'
import type { EventsService } from '../services/eventsService.ts'
import type { LiveService } from '../services/liveService.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { distDirectory, docsRouter, PAGE } from './docs.ts'
import { ROUTES } from './routes.ts'
import type { OpenApiDocument } from './types.ts'

const KEY = 'une-cle-assez-longue'

const services: Services = {
  cameras: {} as CamerasService,
  events: {} as EventsService,
  snapshots: {} as SnapshotsService,
  live: {} as LiveService,
  hue: null,
  plug: null,
  ac: null,
  shutters: null,
  shuttersAuto: null,
  heating: null,
  box: null,
  boxWatcher: null,
  poe: null,
  files: {} as BackupFiles,
  zones: {} as ZonesStore,
  markers: {} as MarkersStore,
  plan: {} as PlanStore,
  recorderUrl: null,
  savedClips: {} as SavedClipsStore,
}

test('/openapi.json et /docs exigent la clé ; avec elle, document, page et fichiers de Swagger UI', async () => {
  await withServer(routerApp(createRoutes(KEY, services)), async (url) => {
    const headers = { 'X-House-Key': KEY }
    for (const path of ['/openapi.json', '/docs', '/docs/swagger-ui-bundle.js']) assert.equal((await call(`${url}${path}`)).status, 401, path)
    const spec = await call(`${url}/openapi.json`, 'GET', undefined, headers)
    assert.equal(spec.status, 200)
    assert.equal((spec.body as OpenApiDocument).info.title, 'House API')
    const page = await call(`${url}/docs`, 'GET', undefined, headers)
    assert.equal(page.status, 200)
    assert.equal(page.body, PAGE)
    assert.match(page.headers.get('content-type') ?? '', /text\/html/)
    for (const file of ['swagger-ui.css', 'swagger-ui-bundle.js']) assert.equal((await call(`${url}/docs/${file}`, 'GET', undefined, headers)).status, 200, file)
  })
})

test('la page n’appelle aucune ressource externe', () => {
  assert.doesNotMatch(PAGE, /https?:\/\//)
})

test('docsRouter accepte un autre dossier de fichiers', async () => {
  assert.ok(distDirectory().includes('swagger-ui-dist'))
  await withServer(routerApp(docsRouter(distDirectory())), async (url) => {
    assert.equal((await call(`${url}/openapi.json`)).status, 200)
  })
})

interface Layer {
  route?: { path: string; methods: Record<string, boolean> }
  handle?: { stack?: Layer[] }
}

/** Les routes réellement enregistrées par le routeur (sous-routeurs compris), chemins au format OpenAPI. */
const mounted = (stack: Layer[]): { path: string; methods: string[]; any: boolean }[] =>
  stack.flatMap((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).filter((name) => name !== '_all')
      return [{ path: layer.route.path.replace(/:(\w+)/g, '{$1}'), methods, any: layer.route.methods._all === true }]
    }
    return mounted(layer.handle?.stack ?? [])
  })

test('chaque route montée est décrite, et chaque route décrite est montée', () => {
  const router = createRoutes(KEY, services) as unknown as { stack: Layer[] }
  const found = mounted(router.stack)
  assert.ok(found.length > 40)
  const described = (path: string) => ROUTES.filter((doc) => doc.path === path).map((doc) => doc.method as string)
  for (const route of found) {
    const methods = described(route.path)
    assert.ok(methods.length > 0, `route montée mais pas décrite : ${route.path}`)
    if (!route.any) for (const method of route.methods) assert.ok(methods.includes(method), `${method} ${route.path} n’est pas décrite`)
  }
  for (const doc of ROUTES) {
    const hit = found.some((route) => route.path === doc.path && (route.any || route.methods.includes(doc.method)))
    assert.ok(hit, `décrite mais pas montée : ${doc.method} ${doc.path}`)
  }
})

test('secured de chaque route correspond à SECURED_PATHS', () => {
  for (const doc of ROUTES) {
    const secured = SECURED_PATHS.some((prefix) => doc.path === prefix || doc.path.startsWith(`${prefix}/`))
    assert.equal(doc.secured, secured, doc.path)
  }
})
