import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { tempDir } from './testing.ts'
import { createBoxConnectionsTable, importBoxConnections, parseConnection } from './boxConnections.ts'

const line = (at: number, event = 'connect', mac = 'AA:BB:CC:DD:EE:01') => JSON.stringify({ at, event, mac, name: 'Tel', ip: '192.168.1.9', type: 'smartphone', vendor: 'X' })

test('parseConnection : une ligne bien formée, ou null', () => {
  assert.deepEqual(parseConnection(line(10.7)), { happened_at: 10, event: 'connect', mac: 'AA:BB:CC:DD:EE:01', name: 'Tel', ip: '192.168.1.9', type: 'smartphone', vendor: 'X' })
  assert.deepEqual(parseConnection(JSON.stringify({ at: 1, event: 'disconnect', mac: 'm', name: 'n' })), { happened_at: 1, event: 'disconnect', mac: 'm', name: 'n', ip: null, type: null, vendor: null })
  assert.equal(parseConnection('pas du json'), null)
  assert.equal(parseConnection('null'), null)
  assert.equal(parseConnection(JSON.stringify({ at: '1', event: 'connect', mac: 'm', name: 'n' })), null)
  assert.equal(parseConnection(JSON.stringify({ at: 1, event: 'x', mac: 'm', name: 'n' })), null)
  assert.equal(parseConnection(JSON.stringify({ at: 1, event: 'connect', mac: 1, name: 'n' })), null)
  assert.equal(parseConnection(JSON.stringify({ at: 1, event: 'connect', mac: 'm', name: 1 })), null)
})

test('importBoxConnections : idempotent, fichier absent ignoré, erreur remontée', async () => {
  const dir = tempDir()
  const db = new DatabaseSync(':memory:')
  createBoxConnectionsTable(db)
  createBoxConnectionsTable(db)
  const file = join(dir, 'box.jsonl')
  assert.equal(await importBoxConnections(db, file), 0)
  writeFileSync(file, `${line(100)}\nabîmée\n${line(100, 'disconnect')}\n`)
  assert.equal(await importBoxConnections(db, file), 2)
  assert.equal(await importBoxConnections(db, file), 0)
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM box_connections').get() as { n: number }).n, 2)
  // une écriture qui échoue en cours d’import annule tout et remonte l’erreur
  db.exec("CREATE TRIGGER refuse BEFORE INSERT ON box_connections BEGIN SELECT RAISE(ABORT, 'refusé'); END")
  writeFileSync(file, `${line(200)}\n`)
  await assert.rejects(importBoxConnections(db, file), /refusé/)
  db.exec('DROP TABLE box_connections')
  await assert.rejects(importBoxConnections(db, file))
})
