import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createHouseStateTable, HOUSE_STATE_TABLE } from './houseState.ts'
import { DISABLED_LAN_ACCESS, mergeLanAccess, readLanAccess, writeLanAccess } from './lanAccess.ts'

const memory = () => {
  const db = new DatabaseSync(':memory:')
  createHouseStateTable(db)
  return db
}

const set = (db: DatabaseSync, value: string) => db.prepare(`INSERT INTO ${HOUSE_STATE_TABLE} (key, value, updated_at) VALUES ('lan-access', ?, 1)`).run(value)

test('readLanAccess : tout coupé sans document, avec un document faux ou une table absente', () => {
  const db = memory()
  assert.deepEqual(readLanAccess(db), DISABLED_LAN_ACCESS)
  set(db, 'null')
  assert.deepEqual(readLanAccess(db), DISABLED_LAN_ACCESS)
  db.exec(`DELETE FROM ${HOUSE_STATE_TABLE}`)
  set(db, '{pas du json')
  assert.deepEqual(readLanAccess(db), DISABLED_LAN_ACCESS)
  db.exec(`DROP TABLE ${HOUSE_STATE_TABLE}`)
  assert.deepEqual(readLanAccess(db), DISABLED_LAN_ACCESS)
})

test('readLanAccess : seuls les vrais booléens comptent', () => {
  const db = memory()
  set(db, '{"enabled":true,"cameras":"oui","lights":true}')
  assert.deepEqual(readLanAccess(db), { enabled: true, cameras: false, shutters: false, lights: true, ac: false })
})

test('mergeLanAccess : fusionne des booléens connus, refuse le reste', () => {
  assert.deepEqual(mergeLanAccess(DISABLED_LAN_ACCESS, { ac: true }), { ...DISABLED_LAN_ACCESS, ac: true })
  assert.equal(mergeLanAccess(DISABLED_LAN_ACCESS, {}), null)
  assert.equal(mergeLanAccess(DISABLED_LAN_ACCESS, { autre: true }), null)
  assert.equal(mergeLanAccess(DISABLED_LAN_ACCESS, { ac: 1 }), null)
})

test('writeLanAccess : écrit puis remplace le document', () => {
  const db = memory()
  writeLanAccess(db, { ...DISABLED_LAN_ACCESS, enabled: true }, 5)
  writeLanAccess(db, { ...DISABLED_LAN_ACCESS, shutters: true }, 6)
  assert.deepEqual(readLanAccess(db), { ...DISABLED_LAN_ACCESS, shutters: true })
})
