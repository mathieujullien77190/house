// Les tests des contours du mouvement des clips : node --test (npm test).
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { DEFAULT_CONFIG } from './detector.ts'
import { createEventStore } from './events.ts'
import { appendShapes, buildShapesClip, pruneShapes, shapesClipPath } from './shapes.ts'
import { startServer } from './server.ts'
import type { Config } from './config.ts'

const TRIANGLE: [number, number][] = [[0.1, 0.1], [0.2, 0.1], [0.15, 0.2]]

test('shapesClipPath remplace .mp4 par .shapes.json', () => {
  assert.equal(shapesClipPath('/clips/a.mp4'), '/clips/a.shapes.json')
})

test('appendShapes écrit une ligne par instant dans la tranche de 10 minutes, et rien sans contour', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'shapes-')), 'cam', 'shapes')
  appendShapes(dir, 1234.5678, [])
  assert.equal(existsSync(dir), false)
  appendShapes(dir, 1234.5678, [TRIANGLE])
  appendShapes(dir, 1235, [TRIANGLE])
  assert.deepEqual(readdirSync(dir), ['1200.jsonl'])
  const lines = readFileSync(join(dir, '1200.jsonl'), 'utf-8').trim().split('\n')
  assert.equal(lines.length, 2)
  assert.equal(JSON.parse(lines[0]).t, 1234.57)
})

test('pruneShapes retire les tranches finies avant la date, et ignore un dossier absent ou un autre fichier', () => {
  const dir = mkdtempSync(join(tmpdir(), 'shapes-'))
  for (const name of ['0.jsonl', '600.jsonl', '1200.jsonl', 'notes.txt']) writeFileSync(join(dir, name), 'x')
  pruneShapes(join(dir, 'absent'), 5000)
  pruneShapes(dir, 1000)
  assert.deepEqual(readdirSync(dir).sort(), ['1200.jsonl', '600.jsonl', 'notes.txt'])
})

test('buildShapesClip : instants calés sur le début du clip et avancés du délai, ligne coupée ignorée, faux sans contour', () => {
  const dir = mkdtempSync(join(tmpdir(), 'shapes-'))
  const output = join(dir, 'out.json')
  assert.equal(buildShapesClip({ dir: join(dir, 'absent'), output, from: 0, to: 10 }), false)
  const entry = (t: number) => JSON.stringify({ t, s: [TRIANGLE] })
  writeFileSync(join(dir, '1200.jsonl'), [entry(1203), entry(1210), '{coupée', '', entry(1290)].join('\n'))
  writeFileSync(join(dir, '9000.jsonl'), entry(9000))
  writeFileSync(join(dir, 'notes.txt'), 'x')
  assert.equal(buildShapesClip({ dir, output, from: 1200, to: 1220, delay: 2 }), true)
  const frames = JSON.parse(readFileSync(output, 'utf-8')).frames as [number, unknown][]
  assert.deepEqual(frames.map((f) => f[0]), [1, 8])
  assert.equal(buildShapesClip({ dir, output, from: 1200, to: 1220, delay: 0 }), true)
  assert.equal(buildShapesClip({ dir, output, from: 5000, to: 5010 }), false)
  assert.equal(buildShapesClip({ dir, output, from: 1204, to: 1205, delay: 2 }), false)
})

test('GET /api/events/<id>/shapes.json sert le fichier des contours, 404 sans eux', async () => {
  const root = mkdtempSync(join(tmpdir(), 'shapes-'))
  const config = { ...DEFAULT_CONFIG, cameras: ['cam'], port: 0, clipsDir: root } as unknown as Config
  const store = createEventStore(join(root, 'events.json'))
  const done = store.open('cam', 100)
  const without = store.open('cam', 300)
  store.markShapes(done.id)
  writeFileSync(shapesClipPath(join(root, `${done.id}.mp4`)), '{"frames":[]}')
  writeFileSync(shapesClipPath(join(root, `${without.id}.mp4`)), '{"frames":[]}')
  const missing = store.open('cam', 500)
  store.markShapes(missing.id)
  const server = startServer(config, store, {} as never, {} as never, () => undefined)
  await once(server, 'listening')
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    const ok = await fetch(`${base}/api/events/${done.id}/shapes.json`)
    assert.equal(ok.status, 200)
    assert.deepEqual(await ok.json(), { frames: [] })
    assert.equal((await fetch(`${base}/api/events/${without.id}/shapes.json`)).status, 404)
    assert.equal((await fetch(`${base}/api/events/${missing.id}/shapes.json`)).status, 404)
    assert.equal((await fetch(`${base}/api/events/inconnu/shapes.json`)).status, 404)
  } finally {
    server.close()
    server.closeAllConnections()
  }
})
