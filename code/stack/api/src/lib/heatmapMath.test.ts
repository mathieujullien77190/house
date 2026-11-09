import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accumulate, cellChanges, COLS, downsample, emptyCounts, ROWS, THRESHOLDS } from './heatmapMath.ts'

const CELLS = COLS * ROWS

/** Une image RGBA unie de cette taille et de ce gris. */
const flat = (width: number, height: number, gray: number): Uint8Array => {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([gray, gray, gray, 255], i * 4)
  return data
}

test('downsample : le gris moyen de chaque case, image grande ou plus petite que la grille', () => {
  const big = downsample(flat(192, 108, 100), 192, 108)
  assert.equal(big.length, CELLS)
  assert.ok(big.every((value) => value === 100))
  // plus petite que la grille : chaque case garde au moins un pixel
  const small = downsample(flat(10, 5, 200), 10, 5)
  assert.ok(small.every((value) => value === 200))
  // une image tronquée : les pixels manquants valent 0
  assert.equal(downsample(new Uint8Array(0), 2, 2)[0], 0)
})

test('downsample : le rouge, le vert et le bleu pèsent différemment', () => {
  const data = new Uint8Array(CELLS * 4)
  for (let i = 0; i < CELLS; i++) data.set([255, 0, 0, 255], i * 4)
  assert.equal(downsample(data, COLS, ROWS)[0], 76)
})

test('cellChanges : écart par case, lumière commune enlevée', () => {
  const before = new Uint8Array(CELLS).fill(100)
  const after = new Uint8Array(CELLS).fill(100)
  after[5] = 160
  const changes = cellChanges(before, after)!
  assert.ok(Math.abs(changes[5]! - (60 - 60 / CELLS)) < 0.01)
  assert.ok(changes[6]! < 0.1)
  // tout s'éclaircit pareil : plus aucun changement
  const lighter = cellChanges(before, new Uint8Array(CELLS).fill(130))!
  assert.ok(lighter.every((value) => value === 0))
})

test('cellChanges : null si presque toute l’image change d’un coup', () => {
  const before = new Uint8Array(CELLS).fill(100)
  const after = new Uint8Array(CELLS)
  for (let i = 0; i < CELLS; i++) after[i] = i % 2 === 0 ? 0 : 200
  assert.equal(cellChanges(before, after), null)
})

test('accumulate : +1 par seuil dépassé, plafonné à 65535', () => {
  const counts = emptyCounts()
  assert.equal(counts.length, THRESHOLDS.length)
  const changes = new Float32Array(CELLS)
  changes[0] = 10
  changes[1] = 100
  accumulate(counts, changes)
  assert.deepEqual(
    counts.map((level) => level[0]),
    [1, 1, 1, 0, 0, 0, 0, 0],
  )
  assert.deepEqual(
    counts.map((level) => level[1]),
    [1, 1, 1, 1, 1, 1, 1, 1],
  )
  assert.equal(counts[0]![2], 0)
  counts[0]![1] = 65535
  accumulate(counts, changes)
  assert.equal(counts[0]![1], 65535)
  assert.equal(counts[1]![1], 2)
})
