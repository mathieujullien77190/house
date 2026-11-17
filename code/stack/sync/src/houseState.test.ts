import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createHouseStateTable, HOUSE_FILES, HOUSE_STATE_TABLE, migrateHouseState, readState } from './houseState.ts'
import { tempDir } from './testing.ts'

const dir = tempDir()

const memory = () => {
  const db = new DatabaseSync(':memory:')
  createHouseStateTable(db)
  return db
}

test('readState : le texte du document, ou null s’il n’existe pas', () => {
  const db = memory()
  assert.equal(readState(db, 'zones'), null)
  db.prepare(`INSERT INTO ${HOUSE_STATE_TABLE} (key, value, updated_at) VALUES ('zones', '{}', 1)`).run()
  assert.equal(readState(db, 'zones'), '{}')
})

test('la table se crée sans erreur une seconde fois', () => {
  const db = memory()
  assert.doesNotThrow(() => createHouseStateTable(db))
})

test('migrateHouseState : reprend une seule fois chaque ancien fichier, laisse de côté les absents et les abîmés', () => {
  const house = `${dir}/house`
  mkdirSync(house)
  writeFileSync(`${house}/${HOUSE_FILES.zones}`, '{"cam":[]}')
  writeFileSync(`${house}/${HOUSE_FILES.plan}`, 'pas du json')
  writeFileSync(`${dir}/servos.json`, '{"url":"http://x"}')
  const db = memory()
  assert.equal(migrateHouseState(db, house, 42, { servos: `${dir}/servos.json`, absent: `${dir}/absent.json` }), 2)
  assert.equal(readState(db, 'zones'), '{"cam":[]}')
  assert.equal(readState(db, 'servos'), '{"url":"http://x"}')
  assert.equal(readState(db, 'plan'), null)
  assert.equal(readState(db, 'absent'), null)
  assert.equal((db.prepare(`SELECT updated_at FROM ${HOUSE_STATE_TABLE} WHERE key = 'zones'`).get() as { updated_at: number }).updated_at, 42)
  // une seconde fois : les clés existent, rien n'est repris (même si le fichier a changé)
  writeFileSync(`${house}/${HOUSE_FILES.zones}`, '{"autre":[]}')
  assert.equal(migrateHouseState(db, house, 43), 0)
  assert.equal(readState(db, 'zones'), '{"cam":[]}')
})

test('migrateHouseState : un dossier absent ne reprend rien', () => {
  assert.equal(migrateHouseState(memory(), `${dir}/nulle-part`, 1), 0)
})
