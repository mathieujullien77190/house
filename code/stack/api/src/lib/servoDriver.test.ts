// Tests du pilote des volets à servos et de l'aiguillage Somfy / servos.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_SERVO_CONFIG, type ServoConfig } from './servoConfig.ts'
import { createRoutingDriver, createServoDriver, microseconds, RELEASE_MARGIN_MS, START_MARGIN_MS } from './servoDriver.ts'
import { createMockDriver } from './shutterDriver.ts'

const config: ServoConfig = { ...DEFAULT_SERVO_CONFIG, url: 'http://esp' }
const readConfig = async () => config

const esp = (options: { fail?: string; body?: string } = {}) => {
  const urls: string[] = []
  const fetcher = (async (url: string) => {
    urls.push(url)
    if (options.fail && url.includes(options.fail)) return new Response('non', { status: 500 })
    return new Response(options.body ?? '{"ms":1000}', { status: 200 })
  }) as unknown as typeof fetch
  return { urls, fetcher }
}

const waits = () => {
  const list: number[] = []
  const wait = async (ms: number): Promise<void> => {
    list.push(ms)
    await new Promise((resolve) => setImmediate(resolve))
  }
  return { list, wait }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 30))

test("microseconds : degrés en largeur d'impulsion, bornée", () => {
  assert.equal(microseconds(0), 1500)
  assert.equal(microseconds(90), 2500)
  assert.equal(microseconds(-90), 500)
  assert.equal(microseconds(500), 2500)
  assert.equal(microseconds(-500), 500)
})

test('un ordre : départ, appui, attente, retour pleine vitesse, relâche', async () => {
  const { urls, fetcher } = esp()
  const { list, wait } = waits()
  const driver = createServoDriver({ readConfig, fetcher, wait })
  assert.equal(driver.mock, false)
  await driver.send(2, 'down')
  assert.deepEqual(urls, [`http://esp/set?ch=0&us=${microseconds(-42)}&speed=10`])
  await settle()
  assert.deepEqual(urls, [
    `http://esp/set?ch=0&us=${microseconds(-42)}&speed=10`,
    `http://esp/set?ch=0&us=${microseconds(-50)}&speed=10`,
    `http://esp/set?ch=0&us=${microseconds(-42)}&speed=0`,
    'http://esp/off?ch=0',
  ])
  assert.deepEqual(list, [1000 + START_MARGIN_MS, 1000, 500, 1000 + RELEASE_MARGIN_MS])
})

test('une réponse sans durée compte pour 0', async () => {
  const { fetcher } = esp({ body: 'pas du json' })
  const { list, wait } = waits()
  await createServoDriver({ readConfig, fetcher, wait }).send(2, 'up')
  await settle()
  assert.deepEqual(list, [START_MARGIN_MS, 0, 500, RELEASE_MARGIN_MS])
})

test('un volet sans réglage ou une erreur du premier /set : erreur', async () => {
  const { fetcher } = esp()
  await assert.rejects(createServoDriver({ readConfig, fetcher, wait: waits().wait }).send(9, 'up'), /pas de réglage pour le volet 9/)
  const broken = esp({ fail: '/set' })
  await assert.rejects(createServoDriver({ readConfig, fetcher: broken.fetcher, wait: waits().wait }).send(2, 'up'), /HTTP 500/)
})

test('un nouvel ordre pour le même volet annule la suite du précédent', async () => {
  const { urls, fetcher } = esp()
  const driver = createServoDriver({
    readConfig,
    fetcher,
    wait: (_ms, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('annulé')))),
  })
  await driver.send(2, 'up')
  await driver.send(2, 'stop')
  await settle()
  assert.equal(urls.length, 2)
})

test("une erreur en cours de séquence ou à la relâche l'abandonne", async () => {
  const mid = esp({ fail: `us=${microseconds(50)}` })
  await createServoDriver({ readConfig, fetcher: mid.fetcher, wait: waits().wait }).send(2, 'up')
  await settle()
  assert.equal(mid.urls.length, 2)
  const off = esp({ fail: '/off' })
  await createServoDriver({ readConfig, fetcher: off.fetcher, wait: waits().wait }).send(2, 'up')
  await settle()
  assert.equal(off.urls.length, 4)
})

test("l'attente réelle, l'annulation réelle et fetch par défaut", async () => {
  const { urls, fetcher } = esp({ body: '{"ms":0}' })
  const driver = createServoDriver({ readConfig: async () => ({ ...config, shutters: { '2': { ...config.shutters['2'], up: { ...config.shutters['2'].up, hold: 0 } } } }), fetcher })
  await driver.send(2, 'up')
  await new Promise((resolve) => setTimeout(resolve, 1300))
  assert.equal(urls.length, 4)
  await driver.send(2, 'up')
  await driver.send(2, 'up')
  await assert.rejects(createServoDriver({ readConfig: async () => ({ ...config, url: 'http://127.0.0.1:1' }) }).send(2, 'up'))
})

test("l'aiguillage : servos pour leurs volets, Somfy pour les autres ; simulation seulement sans servo", async () => {
  const somfy = createMockDriver()
  const servo = createMockDriver()
  const routing = createRoutingDriver(somfy, servo, [2])
  assert.equal(routing.mock, false)
  await routing.send(2, 'up')
  await routing.send(1, 'down')
  assert.deepEqual(servo.sent, [{ shadeId: 2, command: 'up' }])
  assert.deepEqual(somfy.sent, [{ shadeId: 1, command: 'down' }])
  assert.equal(createRoutingDriver(somfy, servo, []).mock, true)
})
