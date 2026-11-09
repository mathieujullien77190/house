// Tests de l'assemblage : démarrage, tours périodiques, arrêt propre (serveur, réseau et horloge simulés).
import assert from 'node:assert/strict'
import http from 'node:http'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'
import { writeFileSync } from 'node:fs'
import { afterEach, mock, test } from 'node:test'
import { startApp, unhandledRejectionMessage } from './app.ts'
import { clock, tempDir } from './testing.ts'

afterEach(() => {
  mock.timers.reset()
  mock.restoreAll()
  syncBuiltinESMExports()
})

const fakeServer = () => {
  const events: string[] = []
  const server = {
    listen: (port: number, callback: () => void) => {
      events.push(`listen ${port}`)
      callback()
    },
    closeAllConnections: () => void events.push('closeAllConnections'),
    close: () => void events.push('close'),
  }
  mock.method(http, 'createServer', () => server)
  mock.method(https, 'createServer', () => server)
  syncBuiltinESMExports()
  return events
}

const boot = (extraEnv: Record<string, string> = {}, answer: (url: string) => Response | Promise<Response> = defaultAnswer) => {
  const dir = tempDir()
  const time = clock()
  const logs: string[] = []
  const exits: number[] = []
  const urls: string[] = []
  const deps = {
    env: { DATA_DIR: dir, RECORDER_URLS: 'http://rec:1', HOUSE_KEY: 'secret-key-123', POLL_INTERVAL_SECONDS: '5', ZONES_FILE: `${dir}/zones.json`, SAVED_CLIPS_FILE: `${dir}/saved.json`, PLAN_FILE: `${dir}/plan.json`, GUEST_VISITS_FILE: `${dir}/visits.jsonl`, GUEST_STATE_FILE: `${dir}/guest/state.json`, ...extraEnv },
    fetch: async (url: string) => {
      urls.push(url)
      return answer(url)
    },
    now: time.now,
    log: (message: string) => void logs.push(message),
    exit: (code: number) => void exits.push(code),
  }
  return { dir, time, logs, exits, urls, deps }
}

const defaultAnswer = (url: string): Response => (url.endsWith('/api/config') ? Response.json({ cameras: { cam: {} } }) : url.includes('/api/events') ? Response.json([]) : new Response('', { status: 404 }))

test('démarrage : la base, la page, un premier tour ; arrêt : tout est fermé et le processus quitte', async () => {
  const serverEvents = fakeServer()
  const { logs, exits, deps, dir } = boot()
  writeFileSync(`${dir}/plan.json`, JSON.stringify({ version: 2, trees: [{ id: 't', x: 1, y: 2, r: 3 }] }))
  const app = await startApp(deps)
  assert.deepEqual(serverEvents, ['listen 8081'])
  assert.ok(logs.includes('Page de House Sync en HTTP sur le port 8081'))
  assert.ok(logs.includes(`House Sync démarré (${dir}/events.db, toutes les 5 s)`))
  assert.ok(logs.some((line) => /journal inactif/.test(line)))
  assert.ok(logs.some((line) => /^1 caméra\(s\), 0 nouvel\(aux\) événement\(s\)/.test(line)))
  await new Promise((resolve) => setImmediate(resolve))
  assert.ok(logs.includes('Plan de la maison : 1 élément(s) enregistré(s)'))
  assert.equal((app.db.prepare('SELECT COUNT(*) AS n FROM last_images').get() as { n: number }).n, 1)
  await app.stop()
  assert.deepEqual(exits, [0])
  assert.deepEqual(serverEvents, ['listen 8081', 'closeAllConnections', 'close'])
  assert.throws(() => app.db.prepare('SELECT 1').get())
})

test('les tours reviennent à leur rythme : polling, plan et visites', async () => {
  fakeServer()
  mock.timers.enable({ apis: ['setInterval'] })
  const { urls, deps, dir } = boot()
  const app = await startApp(deps)
  const before = urls.length
  writeFileSync(`${dir}/plan.json`, JSON.stringify({ version: 2, trees: [{ id: 'nouveau', x: 1, y: 2, r: 3 }] }))
  mock.timers.tick(30_000)
  const planRows = () => (app.db.prepare('SELECT COUNT(*) AS n FROM plan').get() as { n: number }).n
  for (let waited = 0; planRows() === 0 && waited < 100; waited += 1) await new Promise((resolve) => setTimeout(resolve, 10))
  assert.ok(urls.length > before)
  assert.equal(planRows(), 1)
  mock.timers.tick(30_000)
  await app.stop()
})

test('l\'arrêt attend la fin du tour en cours (5 s au plus)', async () => {
  fakeServer()
  mock.timers.enable({ apis: ['setInterval'] })
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => (release = resolve))
  let slow = false
  const { deps, exits } = boot({}, async (url) => {
    if (slow && url.endsWith('/api/config')) await gate
    return defaultAnswer(url)
  })
  const app = await startApp(deps)
  slow = true
  const running = app.poller.poll()
  const stopping = app.stop()
  await new Promise((resolve) => setTimeout(resolve, 250))
  assert.deepEqual(exits, [])
  release()
  await running
  await stopping
  assert.deepEqual(exits, [0])
})

test('le port de la page vient de PAGE_PORT', async () => {
  const events = fakeServer()
  const { deps } = boot({ PAGE_PORT: '9443' })
  const app = await startApp(deps)
  assert.deepEqual(events, ['listen 9443'])
  await app.stop()
})

test('avec un certificat, la page est en HTTPS', async () => {
  fakeServer()
  const certs = tempDir()
  writeFileSync(`${certs}/c.pem`, 'CERT')
  writeFileSync(`${certs}/k.pem`, 'KEY')
  const { deps, logs } = boot({ TLS_CERT: `${certs}/c.pem`, TLS_KEY: `${certs}/k.pem` })
  const app = await startApp(deps)
  assert.ok(logs.includes('Page de House Sync en HTTPS sur le port 8081'))
  await app.stop()
})

test('unhandledRejectionMessage : le message d\'une erreur ou le texte de la valeur', () => {
  assert.equal(unhandledRejectionMessage(new Error('boum')), 'Erreur non gérée : boum')
  assert.equal(unhandledRejectionMessage('texte'), 'Erreur non gérée : texte')
})

test('la météo est lue au démarrage puis toutes les 10 minutes, jusqu’à l’arrêt', async () => {
  fakeServer()
  mock.timers.enable({ apis: ['setInterval'] })
  const { urls, deps, logs } = boot({}, (url) => (url.includes('open-meteo') ? Response.json({ current: { weather_code: 61, precipitation: 0.5 } }) : defaultAnswer(url)))
  const app = await startApp(deps)
  await new Promise((resolve) => setImmediate(resolve))
  const weatherCalls = () => urls.filter((url) => url.includes('open-meteo')).length
  assert.equal(weatherCalls(), 1)
  assert.ok(logs.includes('Météo : pluie'))
  mock.timers.tick(600_000)
  assert.equal(weatherCalls(), 2)
  await app.stop()
  mock.timers.tick(600_000)
  assert.equal(weatherCalls(), 2)
})
