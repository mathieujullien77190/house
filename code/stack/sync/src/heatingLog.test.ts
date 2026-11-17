import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createHeatingLogTable, parseHeating, recordHeating } from './heatingLog.ts'

const raw = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({ at: 1_800_000_000, origin: 'auto', minutes: 5, temperature: 2.5, note: null, cost: 0.0265, ...patch })

const memory = () => {
  const db = new DatabaseSync(':memory:')
  createHeatingLogTable(db)
  return db
}
const rows = (db: DatabaseSync) => db.prepare('SELECT started_at, origin, minutes, temperature, note, cost FROM heating_log ORDER BY started_at, origin').all()

test('parseHeating : une activation bien formée, ou null', () => {
  assert.deepEqual(parseHeating(raw({ note: 'x' })), { started_at: 1_800_000_000, origin: 'auto', minutes: 5, temperature: 2.5, note: 'x', cost: 0.0265 })
  assert.deepEqual(parseHeating({ at: 1.9, origin: 'manuel', minutes: 4.6 }), { started_at: 1, origin: 'manuel', minutes: 5, temperature: null, note: null, cost: null })
  assert.equal(parseHeating(raw({ note: 'x'.repeat(300) }))?.note?.length, 200)
  assert.equal(parseHeating(raw({ origin: 'externe' })), null)
  assert.equal(parseHeating(raw({ minutes: null })), null)
  assert.equal(parseHeating(raw({ at: 'hier' })), null)
  assert.equal(parseHeating(raw({ at: Infinity })), null)
})

test('recordHeating : range une activation nouvelle, refuse une activation abîmée ou déjà là', () => {
  const db = memory()
  assert.equal(recordHeating(db, raw({ at: 10 })), true)
  assert.equal(recordHeating(db, raw({ at: 10 })), false)
  assert.equal(recordHeating(db, raw({ at: 'hier' })), false)
  assert.equal(recordHeating(db, raw({ at: 20, origin: 'manuel', temperature: null, cost: null })), true)
  assert.deepEqual(
    rows(db).map((row) => row.started_at),
    [10, 20],
  )
  assert.equal((rows(db)[1] as { cost: unknown }).cost, null)
})

test('recordHeating : une erreur de la base remonte', () => {
  const db = memory()
  db.exec("CREATE TRIGGER refuse BEFORE INSERT ON heating_log BEGIN SELECT RAISE(ABORT, 'refusé'); END")
  assert.throws(() => recordHeating(db, raw()), /refusé/)
})
