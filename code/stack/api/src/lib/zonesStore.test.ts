import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createZonesStore, parsePolygon } from './zonesStore.ts'

test('un polygone valable : de 3 à 32 sommets entre 0 et 1', () => {
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
  const dir = mkdtempSync(join(tmpdir(), 'zones-'))
  try {
    const store = createZonesStore(join(dir, 'zones.json'))
    assert.deepEqual(store.get(), {})
    const triangle: [number, number][] = [
      [0, 0],
      [1, 0],
      [0, 1],
    ]
    assert.deepEqual(store.set('voliere-interieur', triangle), { 'voliere-interieur': triangle })
    assert.deepEqual(createZonesStore(join(dir, 'zones.json')).get(), { 'voliere-interieur': triangle })
    assert.deepEqual(store.set('voliere-interieur', null), {})
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
