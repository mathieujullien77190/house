// Tests du bouton « Tester » des servos : la séquence d'un ordre vers l'ESP32.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ServoOrder } from './servos.ts'
import { createServoTester, microseconds } from './servoTest.ts'

const order: ServoOrder = { channel: 3, start: -40, end: -50, speed: 10, hold: 0.5 }

/** Un faux ESP32 : garde les adresses appelées ; `fail` : les adresses qui répondent 500 ; `body` : la réponse des /set. */
const esp = (options: { fail?: string; body?: string } = {}) => {
  const urls: string[] = []
  const fetch = async (url: string): Promise<Response> => {
    urls.push(url)
    if (options.fail && url.includes(options.fail)) return new Response('non', { status: 500 })
    return new Response(options.body ?? '{"ms":1000}', { status: 200 })
  }
  return { urls, fetch }
}

/** Une attente instantanée qui garde les durées. */
const waits = () => {
  const list: number[] = []
  const wait = async (ms: number): Promise<void> => {
    list.push(ms)
    await new Promise((resolve) => setImmediate(resolve))
  }
  return { list, wait }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 30))

test('microseconds : degrés en largeur d\'impulsion, bornée', () => {
  assert.equal(microseconds(0), 1500)
  assert.equal(microseconds(90), 2500)
  assert.equal(microseconds(-90), 500)
  assert.equal(microseconds(500), 2500)
  assert.equal(microseconds(-500), 500)
})

test('la séquence : départ, appui, attente, retour pleine vitesse, relâche', async () => {
  const { urls, fetch } = esp()
  const { list, wait } = waits()
  await createServoTester({ fetch, wait })('http://esp', order)
  assert.deepEqual(urls, [`http://esp/set?ch=3&us=${microseconds(-40)}&speed=10`])
  await settle()
  assert.deepEqual(urls, [
    `http://esp/set?ch=3&us=${microseconds(-40)}&speed=10`,
    `http://esp/set?ch=3&us=${microseconds(-50)}&speed=10`,
    `http://esp/set?ch=3&us=${microseconds(-40)}&speed=0`,
    'http://esp/off?ch=3',
  ])
  assert.deepEqual(list, [1200, 1000, 500, 1800])
})

test('une réponse sans durée compte pour 0', async () => {
  const { fetch } = esp({ body: 'pas du json' })
  const { list, wait } = waits()
  await createServoTester({ fetch, wait })('http://esp', order)
  await settle()
  assert.deepEqual(list, [200, 0, 500, 800])
})

test('origine : seulement 0° à la vitesse réglée', async () => {
  const { urls, fetch } = esp()
  await createServoTester({ fetch, wait: waits().wait })('http://esp', order, true)
  await settle()
  assert.deepEqual(urls, ['http://esp/set?ch=3&us=1500&speed=10'])
})

test('une erreur du premier /set remonte', async () => {
  const { fetch } = esp({ fail: '/set' })
  await assert.rejects(createServoTester({ fetch, wait: waits().wait })('http://esp', order), /HTTP 500/)
})

test('un nouveau test sur le même canal annule la suite du précédent', async () => {
  const { urls, fetch } = esp()
  const tester = createServoTester({
    fetch,
    wait: (_ms, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('annulé')))),
  })
  await tester('http://esp', order)
  await tester('http://esp', order, true)
  await tester('http://esp', order)
  await settle()
  assert.equal(urls.length, 3)
})

test("une erreur en cours de séquence l'abandonne, une erreur de la relâche aussi", async () => {
  const mid = esp({ fail: `us=${microseconds(-50)}` })
  await createServoTester({ fetch: mid.fetch, wait: waits().wait })('http://esp', order)
  await settle()
  assert.equal(mid.urls.length, 2)
  const off = esp({ fail: '/off' })
  await createServoTester({ fetch: off.fetch, wait: waits().wait })('http://esp', order)
  await settle()
  assert.equal(off.urls.length, 4)
})

test("l'attente réelle : la séquence se termine, et un nouveau test l'annule", async () => {
  const { urls, fetch } = esp({ body: '{"ms":0}' })
  const tester = createServoTester({ fetch })
  await tester('http://esp', { ...order, hold: 0 })
  await new Promise((resolve) => setTimeout(resolve, 1300))
  assert.equal(urls.length, 4)
  await tester('http://esp', order)
  await tester('http://esp', order, true)
  assert.equal(urls.length, 6)
})
