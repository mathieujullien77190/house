// Tests de l'écoute du flux d'événements du pont Hue (https simulé, temps simulé).
import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { createSseParser, openHueStream, parseMessages, type HueStreamMessage } from './hueStream.ts'
import { fakeHttpsGet, flush } from './testing.ts'

afterEach(() => {
  mock.timers.reset()
  mock.restoreAll()
})

test('createSseParser : un message par ligne vide, morceaux recollés, commentaires ignorés', () => {
  const got: string[] = []
  const parse = createSseParser((data) => got.push(data))
  parse(': hi\r\n\r\n')
  parse('id: 1\ndata: [1,')
  parse('2]\n\ndata: a\ndata: b\n\n')
  parse('\n')
  assert.deepEqual(got, ['[1,2]', 'a\nb'])
})

test('createSseParser : un flux sans fin de ligne qui grossit est abandonné', () => {
  const got: string[] = []
  const parse = createSseParser((data) => got.push(data))
  parse('x'.repeat(1_000_001))
  parse('data: ok\n\n')
  assert.deepEqual(got, ['ok'])
  // Avec une fin de ligne en route, le tampon est gardé jusqu\'à son tour.
  parse(`${'y'.repeat(1_000_001)}\ndata: suite\n\n`)
  assert.deepEqual(got, ['ok', 'suite'])
})

test('parseMessages : un tableau de messages avec des données, rien sinon', () => {
  assert.deepEqual(parseMessages('[{"type":"update","data":[]},{"type":"x"},null]'), [{ type: 'update', data: [] }])
  assert.deepEqual(parseMessages('{}'), [])
  assert.deepEqual(parseMessages('pas du json'), [])
})

const message = JSON.stringify([{ type: 'update', data: [{ type: 'light', id: 'l1' }] }])

test('openHueStream : le flux s\'ouvre, les messages arrivent, la fermeture relance avec un délai qui double', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  let answers = 0
  const { requests, responses } = fakeHttpsGet(() => {
    answers += 1
    return answers === 1 ? { hang: true } : { status: 503 }
  })
  const messages: HueStreamMessage[] = []
  const states: string[] = []
  const stream = openHueStream('pont', 'cle', (m) => messages.push(m), (s) => states.push(s))
  await flush()
  assert.equal(requests[0]?.options.path, '/eventstream/clip/v2')
  assert.deepEqual(requests[0]?.options.headers, { 'hue-application-key': 'cle', Accept: 'text/event-stream' })
  assert.deepEqual(states, ['flux ouvert'])
  responses[0]?.emit('data', `data: ${message}\n\n`)
  assert.equal(messages.length, 1)
  assert.equal(messages[0]?.type, 'update')
  // Le pont ferme : nouvel essai dans 2 s, puis 4 s (HTTP 503), 8 s...
  responses[0]?.emit('end')
  assert.match(states[1] ?? '', /fermé par le pont.*2 s/)
  // Un second signe d'échec pendant l'attente ne programme pas un second essai.
  responses[0]?.emit('end')
  assert.equal(states.length, 2)
  mock.timers.tick(2000)
  await flush()
  assert.equal(requests.length, 2)
  assert.match(states[2] ?? '', /HTTP 503.*4 s/)
  mock.timers.tick(4000)
  await flush()
  assert.equal(requests.length, 3)
  assert.match(states[3] ?? '', /8 s/)
  stream.stop()
})

test('openHueStream : le délai plafonne à une minute et repart de 2 s après une connexion réussie', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { requests } = fakeHttpsGet(() => ({ error: 'refusé' }))
  const states: string[] = []
  const stream = openHueStream('pont', 'cle', () => undefined, (s) => states.push(s))
  for (let i = 0; i < 8; i += 1) {
    await flush()
    mock.timers.tick(60_000)
  }
  await flush()
  assert.ok(states.some((s) => /refusé.*60 s/.test(s)))
  assert.ok(requests.length >= 8)
  stream.stop()
})

test('openHueStream : le silence du pont et les erreurs de la réponse relancent', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { requests, responses } = fakeHttpsGet(() => ({ hang: true }))
  const states: string[] = []
  const stream = openHueStream('pont', 'cle', () => undefined, (s) => states.push(s))
  await flush()
  assert.equal(requests[0]?.idleMs, 5 * 60_000)
  requests[0]?.idleCallback()
  assert.match(states[1] ?? '', /silence du pont/)
  assert.equal(requests[0]?.destroyed, true)
  mock.timers.tick(2000)
  await flush()
  responses[1]?.emit('error', new Error('coupé'))
  assert.match(states[3] ?? '', /coupé/)
  stream.stop()
})

test('openHueStream : stop arrête tout, même une attente ; plus de nouvel essai', async () => {
  mock.timers.enable({ apis: ['setTimeout'] })
  const { requests } = fakeHttpsGet(() => ({ error: 'refusé' }))
  const states: string[] = []
  const stream = openHueStream('pont', 'cle', () => undefined, (s) => states.push(s))
  await flush()
  stream.stop()
  mock.timers.tick(10_000)
  await flush()
  assert.equal(requests.length, 1)
  // Une erreur après l\'arrêt est ignorée.
  requests[0]?.emit('error', new Error('tard'))
  assert.equal(states.length, 1)
})

test('openHueStream : stop sans attente en cours détruit la requête ouverte', async () => {
  const { requests } = fakeHttpsGet(() => ({ hang: true }))
  const stream = openHueStream('pont', 'cle', () => undefined, () => undefined)
  await flush()
  stream.stop()
  assert.equal(requests[0]?.destroyed, true)
})
