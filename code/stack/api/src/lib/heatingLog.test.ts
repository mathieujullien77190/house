import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createHeatingLog, parseEntry, type HeatingEntry } from './heatingLog.ts'

const entry = (at: number, patch: Partial<HeatingEntry> = {}): HeatingEntry => ({ at, origin: 'auto', minutes: 5, temperature: 2.5, note: null, cost: 0.0265, ...patch })

test('parseEntry : une ligne bien formée, ou null', () => {
  assert.deepEqual(parseEntry(JSON.stringify(entry(10))), entry(10))
  assert.deepEqual(parseEntry('{"at":1,"origin":"manuel","minutes":5,"note":"x"}'), { at: 1, origin: 'manuel', minutes: 5, temperature: null, note: 'x', cost: null })
  assert.equal(parseEntry('pas du json'), null)
  assert.equal(parseEntry('null'), null)
  assert.equal(parseEntry('{"at":"1","origin":"auto","minutes":5}'), null)
  assert.equal(parseEntry('{"at":1,"origin":"auto"}'), null)
  assert.equal(parseEntry('{"at":1,"origin":"externe","minutes":5}'), null)
  assert.equal(parseEntry('{"at":1,"origin":3,"minutes":5}'), null)
})

test('le journal : ajoute, relit le plus récent d’abord, ignore les lignes abîmées', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'sous', 'heating-log.jsonl')
    const log = createHeatingLog(file)
    assert.deepEqual(log.recent(10), [])
    assert.equal(log.lastAt(), null)
    log.append(entry(100))
    log.append(entry(300, { origin: 'manuel' }))
    writeFileSync(file, `${readFileSync(file, 'utf8')}ligne abîmée\n`)
    log.append(entry(200))
    assert.deepEqual(
      log.recent(2).map((e) => e.at),
      [200, 300],
    )
    assert.deepEqual(
      log.recent(10).map((e) => e.at),
      [200, 300, 100],
    )
    assert.equal(log.lastAt(), 300)
  })
})

test('la rotation garde les N dernières lignes', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'log.jsonl')
    const log = createHeatingLog(file, 3)
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
    const log = createHeatingLog(join(blocker, 'sous', 'log.jsonl'))
    log.append(entry(1))
    assert.deepEqual(log.recent(5), [])
  })
})
