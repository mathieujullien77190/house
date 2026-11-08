import assert from 'node:assert/strict'
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createShutterLogTable, importShutterLog, parseShutter } from './shutterLog.ts'

const line = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({ at: 1_800_000_000, shutter: '1', name: 'Volet PC', command: 'up', ok: true, note: null, ...patch })

const withFile = async (check: (db: DatabaseSync, file: string) => Promise<void>) => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-shutters-'))
  const db = new DatabaseSync(':memory:')
  createShutterLogTable(db)
  try {
    await check(db, join(dir, 'shutters-log.jsonl'))
  } finally {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  }
}
const rows = (db: DatabaseSync) => db.prepare('SELECT happened_at, shutter, name, command, ok, note FROM shutter_log ORDER BY happened_at, command').all()

test('parseShutter : une ligne bien formée, ou null', () => {
  assert.deepEqual(parseShutter(line({ note: 'simulation' })), { happened_at: 1_800_000_000, shutter: '1', name: 'Volet PC', command: 'up', ok: 1, note: 'simulation' })
  assert.deepEqual(parseShutter(line({ at: 1.9, ok: false, command: 'stop', note: 5 })), { happened_at: 1, shutter: '1', name: 'Volet PC', command: 'stop', ok: 0, note: null })
  assert.equal(parseShutter(line({ note: 'x'.repeat(300) }))?.note?.length, 200)
  assert.equal(parseShutter('pas du json'), null)
  assert.equal(parseShutter('null'), null)
  assert.equal(parseShutter(line({ at: 'hier' })), null)
  assert.equal(parseShutter(line({ shutter: 1 })), null)
  assert.equal(parseShutter(line({ name: 1 })), null)
  assert.equal(parseShutter(line({ ok: 'oui' })), null)
  assert.equal(parseShutter(line({ command: 'my' })), null)
  assert.equal(parseShutter(line({ command: 3 })), null)
})

test('importShutterLog : importe tout, ne reprend jamais deux fois une ligne, garde ce que le fichier a oublié', async () => {
  await withFile(async (db, file) => {
    assert.equal(await importShutterLog(db, file), 0)
    writeFileSync(file, `${line({ at: 10 })}\nabîmée\n${line({ at: 20, command: 'down', ok: false })}\n`)
    assert.equal(await importShutterLog(db, file), 2)
    assert.equal(await importShutterLog(db, file), 0)
    appendFileSync(file, `${line({ at: 30 })}\n`)
    assert.equal(await importShutterLog(db, file), 1)
    // le fichier a tourné : la ligne la plus ancienne n'y est plus, la table la garde
    writeFileSync(file, `${line({ at: 30 })}\n`)
    assert.equal(await importShutterLog(db, file), 0)
    assert.deepEqual(
      rows(db).map((row) => row.happened_at),
      [10, 20, 30],
    )
    assert.equal((rows(db)[1] as { ok: unknown }).ok, 0)
  })
})

test('importShutterLog : une erreur de la base annule le tour et remonte', async () => {
  await withFile(async (db, file) => {
    writeFileSync(file, `${line()}\n`)
    db.exec("CREATE TRIGGER refuse BEFORE INSERT ON shutter_log BEGIN SELECT RAISE(ABORT, 'refusé'); END")
    await assert.rejects(() => importShutterLog(db, file))
  })
})
