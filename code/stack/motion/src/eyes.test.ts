// Les tests des yeux qui brillent : node --test (npm test). Des images synthétiques, et le point d'entrée avec un faux ffmpeg.
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtempSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_CONFIG } from './detector.ts'
import { detectEyes, eyesFromJpeg, parsePgm, type Decoder } from './eyes.ts'
import { createEventStore } from './events.ts'
import { startServer } from './server.ts'
import { createTrigger } from './trigger.ts'
import type { Config } from './config.ts'

const W = 200
const H = 120

/** Une image sombre (gris 40) de 200 × 120. */
const dark = (): Uint8Array => new Uint8Array(W * H).fill(40)

/** Pose un carré de gris `value` de `side` pixels dont le coin est en (x, y). */
const square = (gray: Uint8Array, x: number, y: number, side: number, value = 255): void => {
  for (let j = 0; j < side; j += 1) for (let i = 0; i < side; i += 1) gray[(y + j) * W + x + i] = value
}

test('un point saturé isolé sur fond sombre est un œil', () => {
  const gray = dark()
  square(gray, 100, 60, 2)
  square(gray, 100, 62, 2) // 2 × 2 + 2 × 2 = un carré de 2 × 4 (8 pixels)
  const result = detectEyes(gray, W, H)
  assert.equal(result.found, true)
  assert.equal(result.pair, false)
  assert.equal(result.eyes.length, 1)
  assert.deepEqual([result.eyes[0].size, result.eyes[0].peak], [8, 255])
  assert.ok(result.eyes[0].contrast > 200)
})

test('deux yeux voisins font une paire, un indice et non une condition', () => {
  const gray = dark()
  square(gray, 100, 60, 3)
  square(gray, 110, 60, 3)
  const result = detectEyes(gray, W, H)
  assert.equal(result.found, true)
  assert.equal(result.pair, true)
  assert.equal(result.eyes.length, 2)
  assert.equal(result.distance, 10)
  // deux yeux trop éloignés : trouvés, mais pas en paire
  const far = dark()
  square(far, 20, 60, 3)
  square(far, 150, 60, 3)
  assert.deepEqual([detectEyes(far, W, H).found, detectEyes(far, W, H).pair], [true, false])
})

test('une image sans point saturé, un pixel seul ou un point à peine plus clair ne donnent rien', () => {
  assert.equal(detectEyes(dark(), W, H).found, false)
  const single = dark()
  single[60 * W + 100] = 255
  assert.equal(detectEyes(single, W, H).found, false)
  const dim = dark()
  square(dim, 100, 60, 3, 240)
  assert.equal(detectEyes(dim, W, H).found, false)
})

test('une tache étendue, une zone claire ou un point au bord ne sont pas des yeux', () => {
  const big = dark()
  square(big, 100, 60, 10)
  assert.equal(detectEyes(big, W, H).found, false)
  const bright = new Uint8Array(W * H).fill(150)
  square(bright, 100, 60, 3)
  assert.equal(detectEyes(bright, W, H).found, false)
  const edge = dark()
  square(edge, 1, 1, 3)
  assert.equal(detectEyes(edge, W, H).found, false)
})

test('une image chargée de points brillants (lampe, feuillage éclairé) est ignorée', () => {
  const gray = dark()
  for (let i = 0; i < 10; i += 1) square(gray, 10 + i * 18, 20, 3)
  assert.equal(detectEyes(gray, W, H).found, false)
  assert.equal(detectEyes(new Uint8Array(10), W, H).found, false)
})

const pgm = (gray: Uint8Array, width: number, height: number): Buffer => Buffer.concat([Buffer.from(`P5\n${width} ${height}\n255\n`), Buffer.from(gray)])

test('parsePgm lit les dimensions et refuse ce qui n’est pas un PGM complet', () => {
  const gray = dark()
  const parsed = parsePgm(pgm(gray, W, H))
  assert.deepEqual([parsed?.width, parsed?.height, parsed?.gray.length], [W, H, W * H])
  assert.equal(parsePgm(Buffer.from('JFIF nope')), null)
  assert.equal(parsePgm(pgm(gray, W, H).subarray(0, 100)), null)
})

test('eyesFromJpeg décode puis cherche ; null si le décodage échoue', async () => {
  const gray = dark()
  square(gray, 100, 60, 3)
  const decode: Decoder = async () => pgm(gray, W, H)
  assert.equal((await eyesFromJpeg(Buffer.from('jpeg'), decode))?.found, true)
  assert.equal(await eyesFromJpeg(Buffer.from('jpeg'), async () => null), null)
  assert.equal(await eyesFromJpeg(Buffer.from('jpeg'), async () => Buffer.from('pas un pgm')), null)
})

test('POST /api/eyes rend les yeux du JPEG envoyé (faux ffmpeg), refuse le reste', async () => {
  const gray = dark()
  square(gray, 100, 60, 3)
  const decode: Decoder = async (jpeg) => (jpeg.toString() === 'bad' ? null : pgm(gray, W, H))
  const config = { ...DEFAULT_CONFIG, cameras: ['cam'], port: 0 } as unknown as Config
  const store = createEventStore(join(mkdtempSync(join(tmpdir(), 'eyes-')), 'events.json'))
  const server = startServer(config, store, {} as never, {} as never, () => undefined, decode, createTrigger(store))
  await once(server, 'listening')
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    const ok = await fetch(`${base}/api/eyes`, { method: 'POST', body: 'jpeg' })
    assert.equal(ok.status, 200)
    const body = (await ok.json()) as { found: boolean; pair: boolean; eyes: { x: number; y: number }[] }
    assert.deepEqual([body.found, body.pair, body.eyes[0].x, body.eyes[0].y], [true, false, 101, 61])
    assert.equal((await fetch(`${base}/api/eyes`, { method: 'POST', body: 'bad' })).status, 400)
    assert.equal((await fetch(`${base}/api/eyes`, { method: 'POST' })).status, 400)
    assert.equal((await fetch(`${base}/api/eyes`)).status, 405)
    const huge = await fetch(`${base}/api/eyes`, { method: 'POST', body: Buffer.alloc(3 * 1024 * 1024 + 10) }).catch(() => null)
    assert.ok(huge === null || huge.status === 413)
    // POST /api/cameras/<caméra>/trigger?reason=eyes : ouvre un événement « eyes », puis le prolonge
    const fired = await fetch(`${base}/api/cameras/cam/trigger?reason=eyes`, { method: 'POST' })
    const first = (await fired.json()) as { id: string; extended: boolean; reason: string }
    assert.deepEqual([fired.status, first.reason, first.extended, store.get(first.id)?.label], [200, 'eyes', false, 'eyes'])
    const again = (await (await fetch(`${base}/api/cameras/cam/trigger?reason=eyes`, { method: 'POST' })).json()) as { id: string; extended: boolean }
    assert.deepEqual([again.id, again.extended], [first.id, true])
    assert.equal((await fetch(`${base}/api/cameras/cam/trigger?reason=nope`, { method: 'POST' })).status, 400)
    assert.equal((await fetch(`${base}/api/cameras/cam/trigger`, { method: 'POST' })).status, 400)
    assert.equal((await fetch(`${base}/api/cameras/inconnue/trigger?reason=eyes`, { method: 'POST' })).status, 404)
  } finally {
    server.close()
    server.closeAllConnections()
  }
})
