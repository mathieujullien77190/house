import assert from 'node:assert/strict'
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createHeatingLogTable, importHeatingLog, parseHeating } from './heatingLog.ts'

const line = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({ at: 1_800_000_000, origin: 'auto', minutes: 5, temperature: 2.5, note: null, cost: 0.0265, ...patch })

const withFile = async (check: (db: DatabaseSync, file: string) => Promise<void>) => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-heating-'))
  const db = new DatabaseSync(':memory:')
  createHeatingLogTable(db)
  try {
    await check(db, join(dir, 'heating-log.jsonl'))
  } finally {
    db.close()
    rmSync(dir, { recursive: true, force: true })
  }
}
const rows = (db: DatabaseSync) => db.prepare('SELECT started_at, origin, minutes, temperature, note, cost FROM heating_log ORDER BY started_at, origin').all()

test('parseHeating : une ligne bien formée, ou null', () => {
  assert.deepEqual(parseHeating(line({ note: 'x' })), { started_at: 1_800_000_000, origin: 'auto', minutes: 5, temperature: 2.5, note: 'x', cost: 0.0265 })
  assert.deepEqual(parseHeating('{"at":1.9,"origin":"manuel","minutes":4.6}'), { started_at: 1, origin: 'manuel', minutes: 5, temperature: null, note: null, cost: null })
  assert.equal(parseHeating('pas du json'), null)
  assert.equal(parseHeating('null'), null)
  assert.equal(parseHeating(line({ origin: 'externe' })), null)
  assert.equal(parseHeating(line({ minutes: null })), null)
  assert.equal(parseHeating(line({ at: 'hier' })), null)
})

test('importHeatingLog : importe tout, ne reprend jamais deux fois une ligne, garde ce que le fichier a oublié', async () => {
  await withFile(async (db, file) => {
    assert.equal(await importHeatingLog(db, file), 0)
    writeFileSync(file, `${line({ at: 10 })}\nabîmée\n${line({ at: 20, origin: 'manuel', temperature: null, cost: null })}\n`)
    assert.equal(await importHeatingLog(db, file), 2)
    assert.equal(await importHeatingLog(db, file), 0)
    appendFileSync(file, `${line({ at: 30 })}\n`)
    assert.equal(await importHeatingLog(db, file), 1)
    // le fichier a tourné : la ligne la plus ancienne n'y est plus, la table la garde
    writeFileSync(file, `${line({ at: 30 })}\n`)
    assert.equal(await importHeatingLog(db, file), 0)
    assert.deepEqual(
      rows(db).map((row) => row.started_at),
      [10, 20, 30],
    )
    assert.equal((rows(db)[1] as { cost: unknown }).cost, null)
  })
})

test('importHeatingLog : une erreur de la base annule le tour et remonte', async () => {
  await withFile(async (db, file) => {
    writeFileSync(file, `${line()}\n`)
    db.exec("CREATE TRIGGER refuse BEFORE INSERT ON heating_log BEGIN SELECT RAISE(ABORT, 'refusé'); END")
    await assert.rejects(() => importHeatingLog(db, file))
  })
})
