import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { openDatabase } from '../db/database.ts'
import { memoryDatabase, withTempDir } from '../testing/helpers.ts'
import type { JournalKind } from './journalClient.ts'
import { createShutterLog, type ShutterEntry } from './shutterLog.ts'

const entry = (at: number, patch: Partial<ShutterEntry> = {}): ShutterEntry => ({ at, shutter: '1', name: 'Salon', command: 'up', ok: true, note: null, ...patch })

test('append envoie l’ordre à House Sync, sans écrire dans la base', () => {
  const db = memoryDatabase()
  const sent: [JournalKind, object][] = []
  const log = createShutterLog((kind, body) => sent.push([kind, body]), db)
  log.append(entry(100))
  assert.deepEqual(sent, [['shutters', entry(100)]])
  assert.deepEqual(log.recent(10), [])
})

test('recent relit la table, le plus récent d’abord', () => {
  const db = memoryDatabase()
  const log = createShutterLog(() => undefined, db)
  const insert = 'INSERT INTO shutter_log (happened_at, shutter, name, command, ok, note) VALUES (?, ?, ?, ?, ?, ?)'
  db.run(insert, 100, '1', 'Salon', 'up', 1, null)
  db.run(insert, 200, '1', 'Salon', 'down', 0, 'muet')
  assert.deepEqual(
    log.recent(10).map((e) => ({ ...e })),
    [entry(200, { command: 'down', ok: false, note: 'muet' }), entry(100)],
  )
  assert.deepEqual(
    log.recent(1).map((e) => e.at),
    [200],
  )
})

test('sans base, rien ne lève', async () => {
  await withTempDir((dir) => {
    const log = createShutterLog(() => undefined, openDatabase(join(dir, 'absente.db')))
    assert.deepEqual(log.recent(10), [])
  })
})
