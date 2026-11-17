import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createShutterLogTable, parseShutter, recordShutter } from './shutterLog.ts'

const raw = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({ at: 1_800_000_000, shutter: '1', name: 'Volet PC', command: 'up', ok: true, note: null, ...patch })

const memory = () => {
  const db = new DatabaseSync(':memory:')
  createShutterLogTable(db)
  return db
}
const rows = (db: DatabaseSync) => db.prepare('SELECT happened_at, shutter, name, command, ok, note FROM shutter_log ORDER BY happened_at, command').all()

test('parseShutter : un ordre bien formé, ou null', () => {
  assert.deepEqual(parseShutter(raw({ note: 'simulation' })), { happened_at: 1_800_000_000, shutter: '1', name: 'Volet PC', command: 'up', ok: 1, note: 'simulation' })
  assert.deepEqual(parseShutter(raw({ at: 1.9, ok: false, command: 'stop', note: 5 })), { happened_at: 1, shutter: '1', name: 'Volet PC', command: 'stop', ok: 0, note: null })
  assert.equal(parseShutter(raw({ note: 'x'.repeat(300) }))?.note?.length, 200)
  assert.equal(parseShutter(raw({ at: 'hier' })), null)
  assert.equal(parseShutter(raw({ at: Infinity })), null)
  assert.equal(parseShutter(raw({ shutter: 1 })), null)
  assert.equal(parseShutter(raw({ name: 1 })), null)
  assert.equal(parseShutter(raw({ ok: 'oui' })), null)
  assert.equal(parseShutter(raw({ command: 'my' })), null)
  assert.equal(parseShutter(raw({ command: 3 })), null)
})

test('recordShutter : range un ordre nouveau, refuse un ordre abîmé ou déjà là', () => {
  const db = memory()
  assert.equal(recordShutter(db, raw({ at: 10 })), true)
  assert.equal(recordShutter(db, raw({ at: 10 })), false)
  assert.equal(recordShutter(db, raw({ at: 'hier' })), false)
  assert.equal(recordShutter(db, raw({ at: 20, command: 'down', ok: false })), true)
  assert.deepEqual(
    rows(db).map((row) => row.happened_at),
    [10, 20],
  )
  assert.equal((rows(db)[1] as { ok: unknown }).ok, 0)
})

test('recordShutter : une erreur de la base remonte', () => {
  const db = memory()
  db.exec("CREATE TRIGGER refuse BEFORE INSERT ON shutter_log BEGIN SELECT RAISE(ABORT, 'refusé'); END")
  assert.throws(() => recordShutter(db, raw()), /refusé/)
})
