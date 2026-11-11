// Tests de la page de House Sync : session, réglages, services de données, fichiers du disque backup, serveur.
import assert from 'node:assert/strict'
import fsModule from 'node:fs'
import https from 'node:https'
import { Readable } from 'node:stream'
import { syncBuiltinESMExports } from 'node:module'
import { mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { afterEach, mock, test } from 'node:test'
import { apiTargetOf, createPage, createPageServer } from './page.ts'
import { fakeRequest, fakeResponse, testContext, type FakeResponse, type TestContext } from './testing.ts'

afterEach(() => {
  mock.restoreAll()
  syncBuiltinESMExports()
})

interface Call {
  method?: string
  url: string
  body?: unknown
  rawBody?: string
  cookie?: string
  range?: string
  ip?: string | undefined
}

const setup = (env: Record<string, string> = {}, prepare: (ctx: TestContext) => void = () => undefined) => {
  const ctx = testContext(undefined, env)
  prepare(ctx)
  const resets: string[] = []
  const hueCalls: string[] = []
  const page = createPage(ctx, {
    hueLog: { list: (params) => (hueCalls.push(params.toString()), { status: { configured: false, listening: false, lastEventAt: null }, entries: [] }) },
    resetLiveFpsCheck: () => void resets.push('reset'),
    watts: { cameras: () => new Map([['cam', 6.5]]), lamps: () => new Map([['Spot', 4]]), machine: () => 12.5 },
  })
  const call = async (spec: Call): Promise<FakeResponse> => {
    const headers: Record<string, string> = {}
    if (spec.cookie) headers.cookie = spec.cookie
    if (spec.range) headers.range = spec.range
    const req = fakeRequest({ method: spec.method, url: spec.url, headers, body: spec.rawBody ?? (spec.body === undefined ? undefined : JSON.stringify(spec.body)), ...('ip' in spec ? { ip: spec.ip } : {}) })
    const res = fakeResponse()
    await page.handlePage(req, res)
    await res.done
    return res
  }
  const login = async (): Promise<string> => {
    const res = await call({ method: 'POST', url: '/login', body: { key: 'secret-key-123' } })
    return String(res.sentHeaders['Set-Cookie']).split(';')[0] ?? ''
  }
  return { ctx, page, call, login, resets, hueCalls }
}

const json = (res: FakeResponse): unknown => JSON.parse(res.text())
const withCamera = (ctx: TestContext) => ctx.db.exec("INSERT INTO last_images VALUES ('cam', 'http://x')")

test('la page compilée est servie ; hors du dossier ou absente, 404', async () => {
  const { ctx, call } = setup()
  mkdirSync(ctx.config.webDir, { recursive: true })
  writeFileSync(`${ctx.config.webDir}/index.html`, '<html></html>')
  writeFileSync(`${ctx.config.webDir}/app.js`, 'x')
  writeFileSync(`${ctx.config.webDir}/data.bin`, 'x')
  const home = await call({ url: '/' })
  assert.equal(home.status, 200)
  assert.equal(home.sentHeaders['Content-Type'], 'text/html; charset=utf-8')
  assert.equal(home.text(), '<html></html>')
  assert.equal((await call({ url: '/app.js' })).sentHeaders['Content-Type'], 'text/javascript; charset=utf-8')
  assert.equal((await call({ url: '/data.bin' })).sentHeaders['Content-Type'], 'application/octet-stream')
  assert.equal((await call({ url: '/absent.css' })).status, 404)
  assert.equal((await call({ url: undefined as unknown as string })).status, 200)
})

test('un dossier de la page mal écrit (« / » final) ne laisse rien sortir : garde-fou contre les chemins hors du dossier', async () => {
  const { ctx, call } = setup({}, (c) => (c.config.webDir = `${c.dir}/web/`))
  mkdirSync(`${ctx.dir}/web`, { recursive: true })
  writeFileSync(`${ctx.dir}/web/index.html`, '<html></html>')
  assert.equal((await call({ url: '/' })).status, 404)
})

test('connexion : la bonne clé ouvre une session, une mauvaise est refusée, 10 échecs bloquent', async () => {
  const { call, ctx } = setup()
  const ok = await call({ method: 'POST', url: '/login', body: { key: 'secret-key-123' } })
  assert.equal(ok.status, 200)
  assert.match(String(ok.sentHeaders['Set-Cookie']), /^house_sync=\d+\.[0-9a-f]+; Path=\/; Max-Age=2592000; HttpOnly; Secure/)
  assert.equal((await call({ method: 'POST', url: '/login', body: { key: 'mauvaise-cle' } })).status, 401)
  assert.equal((await call({ method: 'POST', url: '/login', body: { key: 3 } })).status, 401)
  assert.equal((await call({ method: 'POST', url: '/login', rawBody: 'pas du json' })).status, 401)
  for (let i = 0; i < 8; i += 1) await call({ method: 'POST', url: '/login', body: { key: 'x' } })
  assert.equal((await call({ method: 'POST', url: '/login', body: { key: 'secret-key-123' } })).status, 429)
  ctx.time.advance(16 * 60_000)
  assert.equal((await call({ method: 'POST', url: '/login', body: { key: 'secret-key-123' } })).status, 200)
})

test('connexion : sans adresse connue, une clé trop courte n\'ouvre rien', async () => {
  const { call } = setup({ HOUSE_KEY: 'court' })
  assert.equal((await call({ method: 'POST', url: '/login', body: { key: 'court' } })).status, 401)
  const sans = setup({ HOUSE_KEY: '' })
  assert.equal((await sans.call({ method: 'POST', url: '/login', body: { key: '' }, ip: undefined })).status, 401)
  assert.equal((await sans.call({ url: '/api/settings', cookie: 'house_sync=1.2' })).status, 401)
})

test('déconnexion : le cookie est vidé', async () => {
  const { call } = setup()
  const res = await call({ method: 'POST', url: '/logout' })
  assert.equal(res.status, 200)
  assert.match(String(res.sentHeaders['Set-Cookie']), /^house_sync=; Path=\/; Max-Age=0/)
})

test('les services demandent la session, lue dans le bon cookie', async () => {
  const { call, login } = setup()
  assert.equal((await call({ url: '/api/settings' })).status, 401)
  assert.equal((await call({ url: '/files/clips/cam/x.mp4' })).status, 401)
  const cookie = await login()
  assert.equal((await call({ url: '/api/settings', cookie: 'autre=1; house_sync_x=2' })).status, 401)
  assert.equal((await call({ url: '/api/settings', cookie: `autre=1; ${cookie}` })).status, 200)
  assert.equal((await call({ method: 'DELETE', url: '/api/settings' })).status, 405)
})

test('les services de données', async () => {
  const { ctx, call, login, hueCalls } = setup({ DOCKER_FILE: '', COMPOSE_FILE: '' })
  const cookie = await login()
  const get = async (url: string) => call({ url, cookie })
  withCamera(ctx)
  assert.deepEqual(json(await get('/api/retention')), { clip_retention_days: 15 })
  assert.deepEqual(json(await get('/api/guest')), { guest_fps: 2, guest_enabled: true, guest_link: null })
  const settings = json(await get('/api/settings')) as { camera: string }[]
  assert.deepEqual(settings.map((s) => s.camera), ['cam'])
  const full = json(await get('/api/overview')) as { database: { tables: unknown[]; size: number }; backup: { disk: { total: number } } }
  assert.equal(full.database.tables.length, 14)
  assert.ok(full.backup.disk.total > 0)
  const light = json(await get('/api/overview?part=database')) as typeof full
  assert.equal(light.backup.disk.total, 0)
  assert.deepEqual(json(await get('/api/docker')), { serviceAvailable: false, containers: [], global: null, compose: null, ageSeconds: 0 })
  assert.equal(typeof (json(await get('/api/specs')) as { kernel: string }).kernel, 'string')
  assert.equal((json(await get('/api/hue')) as { configured: boolean }).configured, false)
  assert.deepEqual((json(await get('/api/hue-log?origin=switch')) as { entries: unknown[] }).entries, [])
  assert.deepEqual(hueCalls, ['origin=switch'])
  assert.ok(Array.isArray(json(await get('/api/network'))))
  assert.ok('memory' in (json(await get('/api/system')) as object))
  const power = json(await get('/api/power')) as { camerasError: string }
  assert.equal(power.camerasError, 'API non configurée')
  const energy = json(await get('/api/camera-energy')) as { since: string | null; cameras: unknown[]; total: { kwh: number } }
  assert.deepEqual(energy, { since: null, cameras: [], total: { kwh: 0, cost: 0 } })
  assert.deepEqual(json(await get('/api/lamp-energy')), { since: null, lamps: [], total: { kwh: 0, cost: 0 } })
  assert.deepEqual(json(await get('/api/machine-energy')), { since: null, kwh: 0, cost: 0, watts: 12.5 })
  ctx.db.exec("INSERT INTO camera_energy VALUES ('cam', 'h', 1, 0, 0.1), ('autre', 'h', 1, 0, 0.1)")
  ctx.db.exec("INSERT INTO lamp_energy VALUES ('Spot', 'h', 1, 0, 0.1), ('Eteinte', 'h', 0.5, 0, 0.1)")
  const cameras = (json(await get('/api/camera-energy')) as { cameras: { camera: string; watts: number | null }[] }).cameras
  assert.deepEqual(cameras.map((c) => [c.camera, c.watts]), [['autre', null], ['cam', 6.5]])
  const lamps = (json(await get('/api/lamp-energy')) as { lamps: { lamp: string; watts: number | null }[] }).lamps
  assert.deepEqual(lamps.map((l) => [l.lamp, l.watts]), [['Spot', 4], ['Eteinte', null]])
  assert.equal((await get('/api/inconnu')).status, 404)
  assert.equal((await get('/files/autre/chose.txt')).status, 404)
})

test('/api/table : une page d\'une table, ou 404', async () => {
  const { ctx, call, login } = setup()
  const cookie = await login()
  withCamera(ctx)
  const table = json(await call({ url: '/api/table?name=last_images&page=0&size=5', cookie })) as { total: number; items: { camera: string }[] }
  assert.equal(table.total, 1)
  assert.equal(table.items[0]?.camera, 'cam')
  assert.equal((await call({ url: '/api/table?name=inconnue', cookie })).status, 404)
  assert.equal((await call({ url: '/api/table', cookie })).status, 404)
})

test('/api/clips : un clip par événement, avec ses filtres et la liste des sauvegardés', async () => {
  const { ctx, call, login } = setup()
  const cookie = await login()
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  mkdirSync(`${ctx.dir}/clips/autre`, { recursive: true })
  for (const name of ['clips/cam/100.5-cam.mp4', 'clips/cam/100.5-cam.h264.mp4', 'clips/cam/200.1-cam.mp4', 'clips/autre/300.2-autre.mp4']) writeFileSync(`${ctx.dir}/${name}`, 'x')
  writeFileSync(`${ctx.dir}/saved.json`, JSON.stringify({ ids: ['200.1-cam'] }))
  const list = async (query: string) => json(await call({ url: `/api/clips${query}`, cookie })) as { items: { id: string }[]; total: number; cameras: string[] }
  const all = await list('')
  assert.equal(all.total, 3)
  assert.deepEqual(all.cameras, ['autre', 'cam'])
  assert.deepEqual((await list('?saved=1')).items.map((i) => i.id), ['clips/cam/200.1-cam'])
  assert.equal((await list('?saved=0')).total, 2)
  assert.equal((await list('?camera=cam')).total, 2)
  assert.equal((await list('?camera=cam&from=150')).total, 1)
  assert.equal((await list('?page=1&size=2')).items.length, 1)
  // Liste des sauvegardés illisible : elle compte pour vide.
  ctx.config.savedClipsFile = `${ctx.dir}/absent/saved.json`
  assert.equal((await list('?saved=1')).total, 0)
  assert.equal((await list('?saved=0')).total, 3)
})

test('/files : le fichier entier, un morceau, un intervalle faux, un fichier absent ou illisible', async () => {
  const { ctx, call, login } = setup()
  const cookie = await login()
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  mkdirSync(`${ctx.dir}/snapshots/cam`, { recursive: true })
  mkdirSync(`${ctx.dir}/clips/cam/dossier.mp4`)
  writeFileSync(`${ctx.dir}/clips/cam/a.mp4`, '0123456789')
  writeFileSync(`${ctx.dir}/snapshots/cam/1.jpg`, 'JPEG')
  const whole = await call({ url: '/files/clips/cam/a.mp4', cookie })
  assert.deepEqual([whole.status, whole.text(), whole.sentHeaders['Content-Type'], whole.sentHeaders['Content-Length']], [200, '0123456789', 'video/mp4', 10])
  const part = await call({ url: '/files/clips/cam/a.mp4', cookie, range: 'bytes=2-4' })
  assert.deepEqual([part.status, part.text(), part.sentHeaders['Content-Range'], part.sentHeaders['Content-Length']], [206, '234', 'bytes 2-4/10', 3])
  const wrong = await call({ url: '/files/clips/cam/a.mp4', cookie, range: 'bytes=50-' })
  assert.deepEqual([wrong.status, wrong.sentHeaders['Content-Range']], [416, 'bytes */10'])
  const image = await call({ url: '/files/snapshots/cam/1.jpg', cookie })
  assert.deepEqual([image.status, image.sentHeaders['Content-Type']], [200, 'image/jpeg'])
  assert.equal((await call({ url: '/files/clips/cam/absent.mp4', cookie })).status, 404)
  // Un « fichier » qui est un dossier : l'en-tête est parti, la lecture échoue, la connexion est fermée.
  const broken = await call({ url: '/files/clips/cam/dossier.mp4', cookie })
  assert.equal(broken.status, 200)
  assert.equal(broken.destroyed, true)
  mock.method(fsModule, 'createReadStream', () => new Readable({ read() { this.destroy(new Error('lecture coupée')) } }))
  syncBuiltinESMExports()
  const brokenRange = await call({ url: '/files/clips/cam/a.mp4', cookie, range: 'bytes=0-3' })
  assert.equal(brokenRange.status, 206)
  assert.equal(brokenRange.destroyed, true)
})

const putSettings = (body: unknown) => ({ method: 'PUT', url: '/api/settings', body })

test('PUT /api/settings : la session, le JSON, la caméra et chaque réglage sont vérifiés', async () => {
  const { ctx, call, login, resets } = setup()
  const cookie = await login()
  withCamera(ctx)
  assert.equal((await call(putSettings({ camera: 'cam' }))).status, 401)
  assert.equal((await call({ ...putSettings(undefined), rawBody: 'x', cookie })).status, 400)
  assert.equal((await call({ ...putSettings({ camera: 'inconnue' }), cookie })).status, 404)
  assert.equal((await call({ ...putSettings({}), cookie })).status, 404)
  const refused: Record<string, unknown>[] = [
    { clips_mode: 'souvent' },
    { clips_mode: 3 },
    { snapshot_seconds: 45 },
    { snapshot_seconds: '60' },
    { live_fps: 0 },
    { light_fps: 26 },
    { live_fps_mobile: 'x' },
    { light_fps_mobile: 1.5 },
    { motion_sensitivity: 6 },
    { motion_min_seconds: 31 },
    { motion_min_seconds: -1 },
    { motion_min_seconds: 1.5 },
    { orientation: 'diagonale' },
    { orientation: 1 },
    { rain_mode: 'auto' },
    { rain_mode: 1 },
  ]
  for (const patch of refused) assert.equal((await call({ ...putSettings({ camera: 'cam', ...patch }), cookie })).status, 400, JSON.stringify(patch))
  assert.equal(resets.length, 0)
  const res = await call({ ...putSettings({ camera: 'cam', clips_mode: 'night', snapshot_seconds: 120, live_fps: 10, light_fps: 5, live_fps_mobile: 4, light_fps_mobile: 3, motion_sensitivity: 5, motion_min_seconds: 6, orientation: 'portrait' }), cookie })
  assert.equal(res.status, 200)
  assert.deepEqual(json(res), { camera: 'cam', clips_mode: 'night', live_fps: 10, light_fps: 5, live_fps_mobile: 4, light_fps_mobile: 3, motion_sensitivity: 5, motion_min_seconds: 6, snapshot_seconds: 120, orientation: 'portrait', rain_mode: 'off', rain_now: 'off' })
  assert.equal(resets.length, 1)
  assert.match(ctx.logs.at(-1) ?? '', /Réglages de cam : clips night, direct 4K à 10 images\/s/)
  // Un second envoi partiel garde le reste.
  const again = json(await call({ ...putSettings({ camera: 'cam', live_fps: 8 }), cookie })) as { clips_mode: string; live_fps: number }
  assert.deepEqual([again.clips_mode, again.live_fps], ['night', 8])
  // Le mode pluie : allumé, puis gardé par un envoi qui n'en parle pas.
  assert.equal((json(await call({ ...putSettings({ camera: 'cam', rain_mode: 'on' }), cookie })) as { rain_mode: string }).rain_mode, 'on')
  assert.equal((json(await call({ ...putSettings({ camera: 'cam', live_fps: 9 }), cookie })) as { rain_mode: string }).rain_mode, 'on')
})

test('PUT /api/retention : de 1 à 3650 jours', async () => {
  const { call, login } = setup()
  const put = (body: unknown, cookie?: string) => call({ method: 'PUT', url: '/api/retention', body, cookie })
  assert.equal((await put({ clip_retention_days: 30 })).status, 401)
  const cookie = await login()
  assert.equal((await call({ method: 'PUT', url: '/api/retention', rawBody: '[', cookie })).status, 400)
  assert.equal((await put({ clip_retention_days: 0 }, cookie)).status, 400)
  assert.equal((await put({ clip_retention_days: 3651 }, cookie)).status, 400)
  assert.deepEqual(json(await put({ clip_retention_days: 30 }, cookie)), { clip_retention_days: 30 })
  assert.deepEqual(json(await put({}, cookie)), { clip_retention_days: 30 })
  assert.deepEqual(json(await call({ url: '/api/retention', cookie })), { clip_retention_days: 30 })
})

test('GET et PUT /api/guest donnent le lien de la page invité quand GUEST_KEY est réglée', async () => {
  const { call, login } = setup({ GUEST_KEY: 'cle-invite', GUEST_PUBLIC_URL: 'https://pub.example/' })
  const cookie = await login()
  const link = { key: 'cle-invite', port: 8090, url: 'https://pub.example/' }
  assert.deepEqual(json(await call({ url: '/api/guest', cookie })), { guest_fps: 2, guest_enabled: true, guest_link: link })
  assert.deepEqual(json(await call({ method: 'PUT', url: '/api/guest', body: { guest_fps: 3 }, cookie })), { guest_fps: 3, guest_enabled: true, guest_link: link })
})

test('PUT /api/guest : cadence et interrupteur de la page invité', async () => {
  const { ctx, call, login, resets } = setup()
  const put = (body: unknown, cookie?: string) => call({ method: 'PUT', url: '/api/guest', body, cookie })
  assert.equal((await put({ guest_fps: 5 })).status, 401)
  const cookie = await login()
  assert.equal((await call({ method: 'PUT', url: '/api/guest', rawBody: '[', cookie })).status, 400)
  assert.equal((await put({ guest_fps: 0 }, cookie)).status, 400)
  assert.equal((await put({ guest_enabled: 'non' }, cookie)).status, 400)
  assert.deepEqual(json(await put({ guest_fps: 6 }, cookie)), { guest_fps: 6, guest_enabled: true, guest_link: null })
  assert.equal(ctx.logs.at(-1), 'Page invité : 6 images/s')
  assert.deepEqual(json(await put({ guest_enabled: false }, cookie)), { guest_fps: 6, guest_enabled: false, guest_link: null })
  assert.ok(ctx.logs.includes('Page invité : coupée'))
  assert.deepEqual(json(await put({ guest_enabled: true, guest_fps: 7 }, cookie)), { guest_fps: 7, guest_enabled: true, guest_link: null })
  assert.ok(ctx.logs.includes('Page invité : en ligne'))
  assert.equal(resets.length, 3)
  // L'interrupteur ne s'écrit pas : 500.
  writeFileSync(`${ctx.dir}/fichier`, 'x')
  ctx.config.guestStateFile = `${ctx.dir}/fichier/state.json`
  assert.equal((await put({ guest_enabled: false }, cookie)).status, 500)
})

test('une erreur dans une requête répond 500 sans arrêter la page ; après l\'en-tête, la connexion est fermée', async () => {
  const { ctx, call, login } = setup()
  const cookie = await login()
  ctx.db.close()
  assert.equal((await call({ url: '/api/settings', cookie })).status, 500)
  assert.match(ctx.logs.at(-1) ?? '', /^Page : /)
  const { page } = setup()
  const res = fakeResponse()
  res.end = (() => {
    throw new Error('écriture coupée')
  }) as typeof res.end
  await page.handlePage(fakeRequest({ method: 'POST', url: '/logout' }), res)
  assert.equal(res.destroyed, true)
  const cut = setup()
  const other = fakeResponse()
  other.end = (() => {
    throw 'texte'
  }) as typeof other.end
  await cut.page.handlePage(fakeRequest({ method: 'POST', url: '/logout' }), other)
  assert.match(cut.ctx.logs.at(-1) ?? '', /Page : texte/)
})

test('apiTargetOf : la cible de l\'API seulement si tout est réglé', () => {
  const ctx = testContext(undefined, { API_URL: 'https://api:8080', API_SERVERNAME: 'maison' })
  assert.equal(apiTargetOf(ctx.config), null)
  ctx.config.apiCaFile = `${ctx.dir}/absent.pem`
  assert.equal(apiTargetOf(ctx.config), null)
  writeFileSync(`${ctx.dir}/ca.pem`, 'CA')
  ctx.config.apiCaFile = `${ctx.dir}/ca.pem`
  assert.deepEqual(apiTargetOf(ctx.config), { url: 'https://api:8080', key: 'secret-key-123', ca: 'CA', servername: 'maison' })
  ctx.config.houseKey = ''
  assert.equal(apiTargetOf(ctx.config), null)
  ctx.config.houseKey = 'secret-key-123'
  ctx.config.apiUrl = ''
  assert.equal(apiTargetOf(ctx.config), null)
})

test('createPageServer : HTTP sans certificat, HTTPS avec', () => {
  const ctx = testContext()
  const http = createPageServer(ctx.config, () => undefined)
  assert.equal(http.secure, false)
  http.server.close()
  writeFileSync(`${ctx.dir}/cert.pem`, 'CERT')
  writeFileSync(`${ctx.dir}/key.pem`, 'KEY')
  ctx.config.tlsCert = `${ctx.dir}/cert.pem`
  ctx.config.tlsKey = `${ctx.dir}/key.pem`
  const fake = { close: () => undefined }
  const create = mock.method(https, 'createServer', () => fake)
  syncBuiltinESMExports()
  const secure = createPageServer(ctx.config, () => undefined)
  assert.equal(secure.secure, true)
  assert.equal(secure.server, fake as unknown)
  assert.deepEqual(create.mock.calls[0]?.arguments[0], { cert: Buffer.from('CERT'), key: Buffer.from('KEY') })
  ctx.config.tlsKey = `${ctx.dir}/absent.pem`
  assert.equal(createPageServer(ctx.config, () => undefined).secure, false)
})

test('les dates des clips du disque sont lues du plus récent au plus ancien', async () => {
  const { ctx, call, login } = setup()
  const cookie = await login()
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  writeFileSync(`${ctx.dir}/clips/cam/1.0-cam.mp4`, 'x')
  writeFileSync(`${ctx.dir}/clips/cam/2.0-cam.mp4`, 'x')
  utimesSync(`${ctx.dir}/clips/cam/1.0-cam.mp4`, 5000, 5000)
  utimesSync(`${ctx.dir}/clips/cam/2.0-cam.mp4`, 1000, 1000)
  const list = json(await call({ url: '/api/clips', cookie })) as { items: { id: string }[] }
  assert.deepEqual(list.items.map((i) => i.id), ['clips/cam/1.0-cam', 'clips/cam/2.0-cam'])
})

test('/api/overview : compte les clips et les images du disque backup, et la taille de la base', async () => {
  const { ctx, call, login } = setup()
  const cookie = await login()
  mkdirSync(`${ctx.dir}/clips/cam`, { recursive: true })
  mkdirSync(`${ctx.dir}/snapshots/cam`, { recursive: true })
  writeFileSync(`${ctx.dir}/events.db`, '12345')
  writeFileSync(`${ctx.dir}/clips/cam/a.mp4`, 'aaaa')
  writeFileSync(`${ctx.dir}/clips/cam/b.mp4`, 'bb')
  writeFileSync(`${ctx.dir}/snapshots/cam/1.jpg`, 'c')
  const overview = json(await call({ url: '/api/overview', cookie })) as { database: { size: number }; backup: { clips: { count: number; size: number }; snapshots: { count: number; size: number } } }
  assert.equal(overview.database.size, 5)
  assert.deepEqual(overview.backup.clips, { count: 2, size: 6 })
  assert.deepEqual(overview.backup.snapshots, { count: 1, size: 1 })
})

test('une requête sans adresse est traitée comme « / »', async () => {
  const { ctx, page } = setup()
  mkdirSync(ctx.config.webDir, { recursive: true })
  writeFileSync(`${ctx.config.webDir}/index.html`, 'accueil')
  const req = fakeRequest()
  req.url = undefined
  const res = fakeResponse()
  await page.route(req, res)
  assert.equal(res.text(), 'accueil')
})
