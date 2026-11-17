import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createHouseStateTable } from './houseState.ts'
import { putState } from './testing.ts'
import { readZones, validPolygon } from './zones.ts'

test('un polygone valable', () => {
  assert.ok(
    validPolygon([
      [0, 0],
      [1, 0],
      [0, 1],
    ]),
  )
  assert.ok(
    !validPolygon([
      [0, 0],
      [1, 0],
    ]),
  )
  assert.ok(
    !validPolygon([
      [0, 0],
      [1, 0],
      [2, 1],
    ]),
  )
  assert.ok(!validPolygon('x'))
})

const memory = () => {
  const db = new DatabaseSync(':memory:')
  createHouseStateTable(db)
  return db
}

test('les zones : document lu, absent = aucune zone, base illisible ou document abîmé = inconnu', () => {
  const db = memory()
  assert.deepEqual(readZones(db), {})
  putState(
    db,
    'zones',
    JSON.stringify({
      a: [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
      b: [[0, 0]],
    }),
  )
  assert.deepEqual(readZones(db), {
    a: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  })
  putState(db, 'zones', '{abîmé')
  assert.equal(readZones(db), null)
  assert.equal(readZones(new DatabaseSync(':memory:')), null)
})

test('un document qui n’est pas un objet est inconnu', () => {
  const db = memory()
  for (const content of ['[]', 'null', '3']) {
    putState(db, 'zones', content)
    assert.equal(readZones(db), null)
  }
})
