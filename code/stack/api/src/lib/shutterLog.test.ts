import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createShutterLog, parseEntry, type ShutterEntry } from './shutterLog.ts'

const entry = (at: number, patch: Partial<ShutterEntry> = {}): ShutterEntry => ({ at, shutter: '1', name: 'Salon', command: 'up', ok: true, note: null, ...patch })

test('parseEntry : une ligne bien formée, ou null', () => {
  assert.deepEqual(parseEntry(JSON.stringify(entry(10))), entry(10))
  assert.equal(parseEntry(JSON.stringify({ ...entry(10), note: 'x'.repeat(300) }))?.note?.length, 200)
  assert.equal(parseEntry(JSON.stringify({ ...entry(10), note: 5 }))?.note, null)
  assert.equal(parseEntry('pas du json'), null)
  assert.equal(parseEntry('null'), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(10), at: '1' })), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(10), shutter: 1 })), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(10), name: 1 })), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(10), ok: 'oui' })), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(10), command: 'my' })), null)
  assert.equal(parseEntry(JSON.stringify({ ...entry(10), command: 3 })), null)
})

test('le journal : ajoute, relit le plus récent d’abord, ignore les lignes abîmées', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'sous', 'shutters-log.jsonl')
    const log = createShutterLog(file)
    assert.deepEqual(log.recent(10), [])
    log.append(entry(100))
    writeFileSync(file, `${readFileSync(file, 'utf8')}ligne abîmée\n`)
    log.append(entry(200, { command: 'down' }))
    assert.deepEqual(
      log.recent(10).map((e) => e.at),
      [200, 100],
    )
    assert.deepEqual(
      log.recent(1).map((e) => e.at),
      [200],
    )
  })
})

test('la rotation garde les N dernières lignes', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'log.jsonl')
    const log = createShutterLog(file, 3)
    for (let at = 1; at <= 5; at += 1) log.append(entry(at))
    assert.deepEqual(
      log.recent(10).map((e) => e.at),
      [5, 4, 3],
    )
    assert.equal(readFileSync(file, 'utf8').split('\n').filter(Boolean).length, 3)
  })
})

test('une écriture impossible ne lève rien', async () => {
  await withTempDir((dir) => {
    const blocker = join(dir, 'fichier')
    writeFileSync(blocker, 'x')
    const log = createShutterLog(join(blocker, 'sous', 'log.jsonl'))
    assert.doesNotThrow(() => log.append(entry(1)))
    assert.deepEqual(log.recent(10), [])
  })
})
