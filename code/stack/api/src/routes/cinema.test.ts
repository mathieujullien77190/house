import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { CamerasService } from '../services/camerasService.ts'
import type { EventsService } from '../services/eventsService.ts'
import type { LiveService, Upstream } from '../services/liveService.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'
import { call, memoryDoc, routerApp, withServer } from '../testing/helpers.ts'
import { cinemaRouter, type CinemaServices } from './cinema.ts'
import { TV_CAMERAS, type LanDeps } from './lan.ts'

const TV = 'la-cle-de-la-tele-longue'
const HEADERS = { 'X-Lan-Key': TV }

const row = (id: string, clip: string | null, h264: string | null) => ({
  id, camera: 'voliere-interieur', label: 'bird', started_at: 1, ended_at: 2, clip_started_at: 1, saved: false, note: '', emoji: null, orientation: 'landscape', clip, clip_h264: h264,
})

const deps = (tvKey = TV): LanDeps => ({ key: '', tvKey, prefixes: [], host: 'x', port: 8080, doc: memoryDoc('{}') })

const setup = (tvKey = TV) => {
  const queries: unknown[] = []
  const opened: unknown[][] = []
  const events = {
    list: (query: unknown) => {
      queries.push(query)
      return [row('a', 'a.mp4', null), row('b', null, 'b.h264.mp4'), row('c', null, null)]
    },
    clipPath: (id: string, h264: boolean) => (id === 'sans' ? null : id === 'seulhd' && h264 ? null : h264 ? `${id}.h264` : `${id}.hd`),
  } as unknown as EventsService
  const snapshots = { nearest: (camera: string, at: number) => (camera === 'vide' ? null : { path: `snap/${camera}-${at}.jpg` }) } as unknown as SnapshotsService
  const files = { send: (res, path, type) => void res.send(`${path}|${type}`) } as BackupFiles
  const live = {
    mp4: async (camera: string, _signal: AbortSignal, hd: boolean): Promise<Upstream | null> => {
      opened.push([camera, hd])
      return { status: 200, contentType: 'video/mp4', body: new Response('video').body }
    },
  } as unknown as LiveService
  const cameras = { liveStreams: () => [{ camera: 'voliere-interieur', orientation: 'portrait' }] } as unknown as CamerasService
  const services: CinemaServices = { events, snapshots, files, cameras, live }
  return { app: routerApp(cinemaRouter(services, deps(tvKey))), queries, opened }
}

test('sans clé de la télé : 503 ; sans la clé ou avec une mauvaise : 401', async () => {
  await withServer(setup('').app, async (url) => assert.equal((await call(`${url}/cinema/library`, 'GET', undefined, HEADERS)).status, 503))
  await withServer(setup().app, async (url) => {
    assert.equal((await call(`${url}/cinema/library`)).status, 401)
    assert.equal((await call(`${url}/cinema/library`, 'GET', undefined, { 'X-Lan-Key': 'mauvaise-cle-assez-longue' })).status, 401)
  })
})

test('la bibliothèque : une série par caméra, les clips lisibles seulement, plus les sauvegardés', async () => {
  const s = setup()
  await withServer(s.app, async (url) => {
    const reply = await call(`${url}/cinema/library`, 'GET', undefined, HEADERS)
    assert.equal(reply.status, 200)
    assert.equal(reply.headers.get('cache-control'), 'no-store')
    const body = reply.body as { cameras: { id: string; orientation: string; episodes: { id: string; light: boolean; hd: boolean }[] }[]; saved: { id: string }[] }
    assert.deepEqual(body.cameras.map((camera) => camera.id), TV_CAMERAS.map((camera) => camera.id))
    assert.equal(body.cameras[0]?.orientation, 'portrait')
    assert.deepEqual(body.cameras[0]?.episodes.map(({ id, light, hd }) => [id, light, hd]), [['a', false, true], ['b', true, false]])
    assert.deepEqual(body.saved.map((episode) => episode.id), ['a', 'b'])
    assert.equal(s.queries.length, TV_CAMERAS.length + 1)
  })
})

test('un clip : la copie légère par défaut, le HD avec q=hd, le HD si la légère manque ; sinon 404', async () => {
  await withServer(setup().app, async (url) => {
    assert.equal((await call(`${url}/cinema/clip/x1`, 'GET', undefined, HEADERS)).body, 'x1.h264|video/mp4')
    assert.equal((await call(`${url}/cinema/clip/x1?q=hd`, 'GET', undefined, HEADERS)).body, 'x1.hd|video/mp4')
    assert.equal((await call(`${url}/cinema/clip/seulhd`, 'GET', undefined, HEADERS)).body, 'seulhd.hd|video/mp4')
    assert.equal((await call(`${url}/cinema/clip/sans`, 'GET', undefined, HEADERS)).status, 404)
    assert.equal((await call(`${url}/cinema/clip/${encodeURIComponent('a b')}`, 'GET', undefined, HEADERS)).status, 404)
  })
})

test('une vignette : la plus proche, 400 sans caméra ou instant, 404 sans image', async () => {
  await withServer(setup().app, async (url) => {
    const ok = await call(`${url}/cinema/thumb?camera=voliere-interieur&at=5`, 'GET', undefined, HEADERS)
    assert.equal(ok.body, 'snap/voliere-interieur-5.jpg|image/jpeg')
    assert.equal(ok.headers.get('cache-control'), 'private, max-age=86400')
    assert.equal((await call(`${url}/cinema/thumb?at=5`, 'GET', undefined, HEADERS)).status, 400)
    assert.equal((await call(`${url}/cinema/thumb?camera=voliere-interieur&at=x`, 'GET', undefined, HEADERS)).status, 400)
    assert.equal((await call(`${url}/cinema/thumb?camera=vide&at=5`, 'GET', undefined, HEADERS)).status, 404)
  })
})

test('le direct MP4 : léger, ou 4K avec q=hd ; une caméra inconnue : 404', async () => {
  const s = setup()
  await withServer(s.app, async (url) => {
    assert.equal((await call(`${url}/cinema/live/salon-de-jardin/live.mp4`, 'GET', undefined, HEADERS)).body, 'video')
    assert.equal((await call(`${url}/cinema/live/voliere-toit/live.mp4?q=hd`, 'GET', undefined, HEADERS)).body, 'video')
    assert.equal((await call(`${url}/cinema/live/inconnue/live.mp4`, 'GET', undefined, HEADERS)).status, 404)
    assert.deepEqual(s.opened, [['salon-de-jardin', false], ['voliere-toit', true]])
  })
})

test('sans service des caméras : les séries ont l’orientation par défaut', async () => {
  const services = { events: { list: () => [] }, snapshots: {}, files: {}, live: {} } as unknown as CinemaServices
  await withServer(routerApp(cinemaRouter(services, deps())), async (url) => {
    const body = (await call(`${url}/cinema/library`, 'GET', undefined, HEADERS)).body as { cameras: { orientation: string }[] }
    assert.equal(body.cameras[0]?.orientation, 'landscape')
  })
})
