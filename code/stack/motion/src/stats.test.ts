// Les tests du journal des hauteurs de zones et de l'étiquette pluie / feuillage : node --test (npm test).
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { appendStats, FOLIAGE_MIN_FRAMES, heightPercents, labelOf, MIN_RAIN_SECONDS, pruneStats, readShapeStats, readStats, tallPerMinute } from './stats.ts'
import type { StatFrame } from './stats.ts'

const tmp = () => mkdtempSync(join(tmpdir(), 'stats-'))

test('heightPercents donne la hauteur de chaque zone en % et saute les zones vides', () => {
  assert.deepEqual(
    heightPercents([[[0.1, 0.1], [0.2, 0.5], [0.15, 0.3]], [], [[0, 0.2], [0, 0.22]]]),
    [40, 2],
  )
})

test('appendStats écrit une ligne par instant dans la tranche de 10 minutes, et rien sans zone', () => {
  const dir = join(tmp(), 'cam', 'stats')
  appendStats(dir, 1234.5678, [])
  assert.equal(existsSync(dir), false)
  appendStats(dir, 1234.5678, [10, 20])
  appendStats(dir, 1235, [5])
  assert.deepEqual(readdirSync(dir), ['1200.jsonl'])
  const lines = readFileSync(join(dir, '1200.jsonl'), 'utf-8').trim().split('\n')
  assert.deepEqual(JSON.parse(lines[0]), { t: 1234.57, h: [10, 20] })
  assert.equal(lines.length, 2)
})

test('readStats relit les images de la plage, ignore une ligne coupée, un autre fichier et un dossier absent', () => {
  const dir = tmp()
  assert.deepEqual(readStats(join(dir, 'absent'), 0, 10), [])
  appendStats(dir, 100, [1])
  appendStats(dir, 700, [2])
  appendStats(dir, 705, [3])
  appendStats(dir, 5000, [4])
  writeFileSync(join(dir, 'notes.txt'), 'x')
  writeFileSync(join(dir, '600.jsonl'), `${readFileSync(join(dir, '600.jsonl'), 'utf-8')}\n{"t":70\n`)
  assert.deepEqual(readStats(dir, 650, 800).map((f) => f.h), [[2], [3]])
  assert.deepEqual(readStats(dir, 704, 800).map((f) => f.h), [[3]])
})

test('readShapeStats relit les hauteurs depuis le journal des contours', () => {
  const dir = tmp()
  assert.deepEqual(readShapeStats(join(dir, 'absent'), 0, 10), [])
  writeFileSync(
    join(dir, '600.jsonl'),
    `${JSON.stringify({ t: 650, s: [[[0, 0], [0, 0.3]]] })}\n\n{"t":6\n${JSON.stringify({ t: 900, s: [[[0, 0], [0, 0.1]]] })}\n`,
  )
  writeFileSync(join(dir, '9000.jsonl'), '')
  writeFileSync(join(dir, 'notes.txt'), 'x')
  assert.deepEqual(readShapeStats(dir, 600, 800), [{ t: 650, h: [30] }])
})

test('pruneStats retire les tranches finies avant la date, et ignore un dossier absent ou un autre fichier', () => {
  const dir = tmp()
  for (const name of ['0.jsonl', '600.jsonl', '1200.jsonl', 'notes.txt']) writeFileSync(join(dir, name), 'x')
  pruneStats(join(dir, 'absent'), 5000)
  pruneStats(dir, 1000)
  assert.deepEqual(readdirSync(dir).sort(), ['1200.jsonl', '600.jsonl', 'notes.txt'])
})

test('tallPerMinute compte les zones assez hautes par minute, avec une durée plancher', () => {
  const frames: StatFrame[] = [{ t: 1, h: [5, 20, 30] }, { t: 2, h: [25] }]
  assert.equal(tallPerMinute(frames, 20, 60), 3)
  assert.equal(tallPerMinute(frames, 20, 1), (3 * 60) / MIN_RAIN_SECONDS)
})

test('labelOf : pluie, feuillage, rien, et la pluie l’emporte', () => {
  const tall: StatFrame[] = Array.from({ length: FOLIAGE_MIN_FRAMES }, (_, i) => ({ t: i, h: [30, 30, 30] }))
  const settings = { foliageZones: 3, rainZones: 5, rainHeight: 20 }
  assert.equal(labelOf(tall, settings, 60), 'rain')
  assert.equal(labelOf(tall, { ...settings, rainZones: 0 }, 60), 'foliage')
  assert.equal(labelOf(tall, { ...settings, rainZones: 100 }, 60), 'foliage')
  assert.equal(labelOf(tall, { ...settings, rainZones: 100, foliageZones: 0 }, 60), null)
  assert.equal(labelOf(tall.slice(0, FOLIAGE_MIN_FRAMES - 1), { ...settings, rainZones: 0 }, 60), null)
  assert.equal(labelOf(tall, { ...settings, rainZones: 0, foliageZones: 4 }, 60), null)
})
