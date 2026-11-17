import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { openDatabase } from '../db/database.ts'
import { memoryDatabase, withTempDir } from '../testing/helpers.ts'
import { createHeatingLog, type HeatingEntry } from './heatingLog.ts'
import type { JournalKind } from './journalClient.ts'

const entry = (at: number, patch: Partial<HeatingEntry> = {}): HeatingEntry => ({ at, origin: 'auto', minutes: 5, temperature: 2.5, note: null, cost: 0.0265, ...patch })

test('append envoie l’activation à House Sync, sans écrire dans la base', () => {
  const db = memoryDatabase()
  const sent: [JournalKind, object][] = []
  const log = createHeatingLog((kind, body) => sent.push([kind, body]), db)
  log.append(entry(100))
  assert.deepEqual(sent, [['heating', entry(100)]])
  assert.deepEqual(log.recent(10), [])
})

test('recent relit la table, la plus récente d’abord ; lastAt prend le plus grand de la table et de l’envoi', () => {
  const db = memoryDatabase()
  const log = createHeatingLog(() => undefined, db)
  assert.equal(log.lastAt(), null)
  const insert = 'INSERT INTO heating_log (started_at, origin, minutes, temperature, note, cost) VALUES (?, ?, ?, ?, ?, ?)'
  db.run(insert, 100, 'auto', 5, 2.5, null, 0.0265)
  db.run(insert, 300, 'manuel', 10, null, 'x', null)
  assert.deepEqual(
    log.recent(10).map((e) => e.at),
    [300, 100],
  )
  assert.deepEqual(
    log.recent(1).map((e) => ({ ...e })),
    [{ at: 300, origin: 'manuel', minutes: 10, temperature: null, note: 'x', cost: null }],
  )
  assert.equal(log.lastAt(), 300)
  log.append(entry(200))
  assert.equal(log.lastAt(), 300)
  log.append(entry(500))
  log.append(entry(400))
  assert.equal(log.lastAt(), 500)
})

test('sans base, l’envoi seul compte et rien ne lève', async () => {
  await withTempDir((dir) => {
    const log = createHeatingLog(() => undefined, openDatabase(join(dir, 'absente.db')))
    assert.equal(log.lastAt(), null)
    assert.deepEqual(log.recent(5), [])
    log.append(entry(7))
    assert.equal(log.lastAt(), 7)
  })
})
