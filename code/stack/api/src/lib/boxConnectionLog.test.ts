import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createBoxConnectionLog, parseEntry, type BoxConnectionEntry } from './boxConnectionLog.ts'

const entry = (at: number, patch: Partial<BoxConnectionEntry> = {}): BoxConnectionEntry => ({ at, event: 'connect', mac: 'AA:BB:CC:DD:EE:FF', name: 'Tel', ip: '192.168.1.9', type: 'smartphone', vendor: 'X', ...patch })

test('parseEntry : une ligne bien formée, ou null', () => {
  assert.deepEqual(parseEntry(JSON.stringify(entry(10))), entry(10))
  assert.deepEqual(parseEntry(JSON.stringify({ at: 1, event: 'disconnect', mac: 'm', name: 'n' })), { at: 1, event: 'disconnect', mac: 'm', name: 'n', ip: null, type: null, vendor: null })
  assert.equal(parseEntry('pas du json'), null)
  assert.equal(parseEntry('null'), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(1), at: '1' })), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(1), event: 'x' })), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(1), mac: 1 })), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(1), name: 1 })), null)
})

test('le journal : ajoute, relit le plus récent d’abord, ignore les lignes abîmées', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'sous', 'box-connections.jsonl')
    const log = createBoxConnectionLog(file)
    assert.deepEqual(log.recent(10), [])
    log.append([entry(100)])
    writeFileSync(file, `${readFileSync(file, 'utf8')}ligne abîmée\n`)
    log.append([entry(200, { event: 'disconnect' }), entry(300)])
    assert.deepEqual(
      log.recent(10).map((e) => e.at),
      [300, 200, 100],
    )
    assert.deepEqual(
      log.recent(1).map((e) => e.at),
      [300],
    )
  })
})

test('le journal garde les dernières lignes seulement', async () => {
  await withTempDir((dir) => {
    const log = createBoxConnectionLog(join(dir, 'log.jsonl'), 3)
    log.append([entry(1), entry(2), entry(3)])
    log.append([entry(4), entry(5)])
    assert.deepEqual(
      log.recent(10).map((e) => e.at),
      [5, 4, 3],
    )
  })
})

test('une écriture impossible est perdue sans lever d’erreur', async () => {
  await withTempDir((dir) => {
    const blocker = join(dir, 'fichier')
    writeFileSync(blocker, 'x')
    createBoxConnectionLog(join(blocker, 'log.jsonl')).append([entry(1)])
  })
})
