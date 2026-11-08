import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { mock, test } from 'node:test'
import { createApp, createMotionSource, createTemperatureSource } from './app.ts'
import type { Config } from './config.ts'
import type { Database } from './db/database.ts'
import type { HueClient, HueSensor } from './lib/hueClient.ts'
import { call, createDatabaseFile, FIXTURE_ROWS, listen, SCHEMA, withServer, withTempDir } from './testing/helpers.ts'

const KEY = 'une-cle-assez-longue'

const sensor = (name: string, type: string, presence?: boolean | null): HueSensor => ({
  name,
  type,
  state: presence === undefined ? {} : { presence },
  config: {},
})

test('le détecteur de la prise : l’état de mouvement du capteur nommé, ou null', async () => {
  const sensors: Record<string, HueSensor> = {
    '1': sensor('motion exterieur', 'ZLLPresence', true),
    '2': sensor('motion interieur', 'ZLLTemperature', true),
    '3': sensor('motion interieur', 'ZLLPresence', false),
  }
  const hue = { sensors: async () => sensors } as unknown as HueClient
  assert.equal(await createMotionSource(hue, 'motion interieur').presence(), false)
  assert.equal(await createMotionSource(hue, 'motion exterieur').presence(), true)
  assert.equal(await createMotionSource(hue, 'absent').presence(), null)
  sensors['3'] = sensor('motion interieur', 'ZLLPresence', null)
  assert.equal(await createMotionSource(hue, 'motion interieur').presence(), null)
  sensors['3'] = sensor('motion interieur', 'ZLLPresence')
  assert.equal(await createMotionSource(hue, 'motion interieur').presence(), null)
})

const baseConfig = (dir: string): Config => ({
  port: 0,
  webDir: join(dir, 'web'),
  dataDir: join(dir, 'data'),
  stateDir: join(dir, 'state'),
  apiKey: KEY,
  go2rtcUrls: ['http://127.0.0.1:1'],
  switchPoe: null,
  hue: null,
  plug: null,
  plugMotionSensor: 'motion interieur',
  plugTemperatureSensor: 'motion interieur',
  housePosition: { latitude: 48.6, longitude: 2.7 },
  guest: null,
  recorderUrl: null,
  tls: null,
  caCert: '',
})

/** Ferme la base de l'application (sous Windows, un fichier ouvert empêche de supprimer le dossier). */
const serveApp = async (config: Config, work: (url: string) => Promise<void>): Promise<void> => {
  const app = createApp(config)
  try {
    await withServer(app, work)
  } finally {
    ;(app.locals.database as Database).close()
  }
}

const prepare = (dir: string, withDatabase = true): Config => {
  const config = baseConfig(dir)
  mkdirSync(config.webDir, { recursive: true })
  mkdirSync(config.dataDir, { recursive: true })
  writeFileSync(join(config.webDir, 'index.html'), '<h1>House</h1>')
  if (withDatabase) createDatabaseFile(join(config.dataDir, 'events.db'), SCHEMA + FIXTURE_ROWS)
  return config
}

test('l’application assemble les routes publiques, protégées, statiques et les erreurs', async () => {
  await withTempDir(async (dir) => {
    await serveApp(prepare(dir), async (url) => {
      const key = { 'X-House-Key': KEY }
      assert.equal((await call(`${url}/welcome`)).status, 200)
      assert.equal((await call(`${url}/welcome`)).headers.get('x-powered-by'), null)
      // protégé : refusé sans clé, accepté avec
      assert.equal((await call(`${url}/direct`)).status, 401)
      const direct = await call(`${url}/direct`, 'GET', undefined, key)
      assert.equal((direct.body as { camera: string }[])[0].camera, 'cam-a')
      // la WebApp compilée, puis une route inconnue en JSON
      assert.equal((await call(`${url}/`)).body, '<h1>House</h1>')
      assert.deepEqual((await call(`${url}/nimporte`)).body, { error: 'not found' })
      // services non configurés
      for (const path of ['/hue', '/plug', '/poe', '/guest'])
        assert.equal((await call(`${url}${path}`, 'GET', undefined, key)).status, 503, path)
      assert.equal((await call(`${url}/record/cam-a`, 'GET', undefined, key)).status, 503)
      // la clé donne une session par cookie
      const auth = await call(`${url}/auth`, 'GET', undefined, key)
      const cookie = (auth.headers.get('set-cookie') ?? '').split(';')[0]
      assert.equal((await call(`${url}/image`, 'GET', undefined, { Cookie: cookie })).status, 200)
    })
  })
})

test('sans base de House Sync, les routes qui la lisent répondent 503', async () => {
  await withTempDir(async (dir) => {
    await serveApp(prepare(dir, false), async (url) => {
      const reply = await call(`${url}/events`, 'GET', undefined, { 'X-House-Key': KEY })
      assert.deepEqual([reply.status, reply.body], [503, { error: 'database not ready' }])
    })
  })
})

test('la température de la volière : celle du détecteur nommé, ou null', async () => {
  const sensors: Record<string, HueSensor> = {
    '1': { ...sensor('motion interieur', 'ZLLPresence', false), uniqueid: 'aa:bb-02-0406' },
    '2': { ...sensor('motion interieur', 'ZLLTemperature'), uniqueid: 'aa:bb-02-0402', state: { temperature: 251 } },
  }
  const hue = { sensors: async () => sensors } as unknown as HueClient
  assert.equal(await createTemperatureSource(hue, 'motion interieur').read(), 2.5)
  assert.equal(await createTemperatureSource(hue, 'absent').read(), null)
})

test('une prise sans pont Hue : le journal se lit, la règle répond 503', async () => {
  await withTempDir(async (dir) => {
    const config: Config = { ...prepare(dir), plug: { host: '127.0.0.1', port: 1, mac: '' } }
    await serveApp(config, async (url) => {
      const key = { 'X-House-Key': KEY }
      assert.equal((await call(`${url}/plug/heating`, 'GET', undefined, key)).status, 503)
      assert.equal((await call(`${url}/plug/log`, 'GET', undefined, key)).status, 200)
    })
  })
})

test('tous les services configurés : pont Hue, prise, switch, enregistreur, page invité', async () => {
  const log = mock.method(console, 'error', () => undefined)
  const bridge = await listen((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(req.url?.endsWith('/lights') ? JSON.stringify({ '1': { name: 'Lampe', state: { on: false, reachable: true } } }) : '{}')
  })
  try {
    await withTempDir(async (dir) => {
      const config: Config = {
        ...prepare(dir),
        hue: { url: bridge.url, key: 'cle' },
        plug: { host: '127.0.0.1', port: 1, mac: '' },
        switchPoe: { url: 'http://127.0.0.1:1', user: 'a', password: 'b', ports: { cam: 1 } },
        recorderUrl: 'http://127.0.0.1:1',
        guest: { key: 'invite', port: 8090, url: '' },
        caCert: join(dir, 'absent.crt'),
      }
      await serveApp(config, async (url) => {
        const key = { 'X-House-Key': KEY }
        const rooms = (await call(`${url}/hue`, 'GET', undefined, key)).body as { lights: { name: string }[] }[]
        assert.equal(rooms[0].lights[0].name, 'Lampe')
        assert.equal((await call(`${url}/guest`, 'GET', undefined, key)).status, 200)
        assert.equal((await call(`${url}/plug`, 'GET', undefined, key)).status, 502)
        assert.equal((await call(`${url}/plug/heating`, 'GET', undefined, key)).status, 200)
        assert.deepEqual((await call(`${url}/plug/log`, 'GET', undefined, key)).body, [])
        assert.equal((await call(`${url}/record/cam-a`, 'GET', undefined, key)).status, 502)
        assert.equal((await call(`${url}/poe`, 'GET', undefined, key)).status, 500)
        assert.equal((await call(`${url}/rootCA.crt`)).status, 404)
      })
    })
  } finally {
    await bridge.close()
    log.mock.restore()
  }
})
