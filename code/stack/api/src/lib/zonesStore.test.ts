import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDoc } from '../testing/helpers.ts'
import { createZonesStore, parsePolygon } from './zonesStore.ts'

test('un polygone valable : de 3 à 1000 sommets entre 0 et 1', () => {
  assert.deepEqual(
    parsePolygon([
      [0, 0],
      [1, 0],
      [0.123456, 1],
    ]),
    [
      [0, 0],
      [1, 0],
      [0.1235, 1],
    ],
  )
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
      [1.5, 0],
    ]),
    null,
  )
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      [0, 'x'],
    ]),
    null,
  )
  assert.equal(parsePolygon(null), null)
})

test('la zone d’une caméra se garde, se remplace et se retire', () => {
  const doc = memoryDoc()
  const store = createZonesStore(doc)
  assert.deepEqual(store.get(), {})
  const triangle: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
  ]
  assert.deepEqual(store.set('voliere-interieur', triangle), { 'voliere-interieur': triangle })
  assert.deepEqual(createZonesStore(doc).get(), { 'voliere-interieur': triangle })
  assert.deepEqual(store.set('voliere-interieur', null), {})
})

test('un sommet mal formé refuse le polygone', () => {
  assert.equal(parsePolygon([[0, 0], [1, 1], 'x']), null)
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      [1, 1, 1],
    ]),
    null,
  )
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      ['a', 1],
    ]),
    null,
  )
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      [Infinity, 1],
    ]),
    null,
  )
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      [-0.1, 1],
    ]),
    null,
  )
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      [0, 1.1],
    ]),
    null,
  )
  assert.equal(
    parsePolygon([
      [0, 0],
      [1, 1],
      [0, -1],
    ]),
    null,
  )
  assert.equal(parsePolygon(Array.from({ length: 1001 }, () => [0, 0])), null)
})

test('un document de zones abîmé : seules les bonnes entrées sont lues', () => {
  const triangle = [
    [0, 0],
    [1, 0],
    [0, 1],
  ]
  const doc = memoryDoc(JSON.stringify({ bonne: triangle, 'mauvais nom': triangle, vide: [] }))
  assert.deepEqual(createZonesStore(doc).get(), { bonne: triangle })
  for (const text of ['[1, 2]', 'null', 'pas du json']) {
    doc.write(text)
    assert.deepEqual(createZonesStore(doc).get(), {})
  }
})
