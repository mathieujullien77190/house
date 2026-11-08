import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changedShare } from './detector.ts'
import { parsePolygon, polygonMask, type Point } from './zone.ts'

const FULL: Point[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
]
const LEFT_HALF: Point[] = [
  [0, 0],
  [0.5, 0],
  [0.5, 1],
  [0, 1],
]

test('un polygone valable : de 3 à 32 sommets entre 0 et 1', () => {
  assert.deepEqual(parsePolygon(FULL), FULL)
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
    ]),
    null,
  )
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      [2, 0],
    ]),
    null,
  )
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      ['a', 0],
    ]),
    null,
  )
  assert.equal(parsePolygon('x'), null)
  assert.equal(parsePolygon(Array.from({ length: 33 }, () => [0.5, 0.5])), null)
})

test('toute l’image : aucun masque', () => {
  assert.equal(polygonMask(FULL, 160, 90), null)
})

test('la moitié gauche : les pixels de gauche seulement', () => {
  const mask = polygonMask(LEFT_HALF, 4, 2)
  assert.deepEqual([...(mask ?? [])], [1, 1, 0, 0, 1, 1, 0, 0])
})

test('une zone trop petite pour contenir un pixel : aucun masque (toute l’image)', () => {
  const tiny: Point[] = [
    [0.1, 0.1],
    [0.102, 0.1],
    [0.1, 0.102],
  ]
  assert.equal(polygonMask(tiny, 160, 90), null)
})

test('un triangle : le coin est dedans, le coin opposé dehors', () => {
  const triangle: Point[] = [
    [0, 0],
    [1, 0],
    [0, 1],
  ]
  const mask = polygonMask(triangle, 10, 10) ?? new Uint8Array()
  assert.equal(mask[0], 1)
  assert.equal(mask[99], 0)
})

test('le mouvement hors de la zone ne compte pas, dans la zone il compte pour toute la zone', () => {
  const mask = polygonMask(LEFT_HALF, 4, 2)
  const before = new Uint8Array(8)
  const rightMoves = Uint8Array.from([0, 0, 200, 200, 0, 0, 200, 200])
  const leftMoves = Uint8Array.from([200, 200, 0, 0, 200, 200, 0, 0])
  assert.equal(changedShare(before, rightMoves, 25, null), 0.5)
  assert.equal(changedShare(before, rightMoves, 25, mask), 0)
  assert.equal(changedShare(before, leftMoves, 25, mask), 1)
})
