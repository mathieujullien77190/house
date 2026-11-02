// Tests du magasin d'événements et du choix des segments : node --test (npm test).
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import { createEventStore, eventId } from './events.ts'
import { segmentStart, selectSegments } from './segments.ts'

const store = () => createEventStore(`${mkdtempSync(`${tmpdir()}/events-`)}/events.json`)

test('un événement s’ouvre, se ferme puis reçoit son clip', () => {
  const events = store()
  const record = events.open('portail', 1000.5)
  assert.equal(record.id, eventId('portail', 1000.5))
  assert.deepEqual(events.list({ inProgress: true }).map((e) => e.id), [record.id])
  events.close(record.id, 1008)
  assert.equal(events.list({ inProgress: true }).length, 0)
  assert.deepEqual(events.withoutClip().map((e) => e.id), [record.id])
  events.markClip(record.id, 1000)
  assert.equal(events.withoutClip().length, 0)
  assert.equal(events.list({ hasClip: true, inProgress: false }).length, 1)
})

test('list trie du plus récent au plus ancien et filtre par after et before', () => {
  const events = store()
  for (const at of [100, 200, 300]) events.close(events.open('portail', at).id, at + 5)
  assert.deepEqual(events.list().map((e) => e.start_time), [300, 200, 100])
  assert.deepEqual(events.list({ after: 100, before: 300 }).map((e) => e.start_time), [200])
  assert.equal(events.list({ limit: 1 }).length, 1)
})

test('prune retire les événements trop vieux et le fichier garde le reste', () => {
  const file = `${mkdtempSync(`${tmpdir()}/events-`)}/events.json`
  const events = createEventStore(file)
  events.open('portail', 100)
  events.open('portail', 500)
  assert.equal(events.prune(300).length, 1)
  assert.deepEqual(createEventStore(file).list().map((e) => e.start_time), [500])
})

test('segmentStart lit l’heure dans le nom d’un segment', () => {
  assert.equal(segmentStart('1792953695.ts'), 1792953695)
  assert.equal(segmentStart('notes.txt'), null)
})

test('selectSegments garde ceux qui recouvrent la plage, avec une marge', () => {
  const starts = [100, 110, 120, 130, 140, 150]
  assert.deepEqual(selectSegments(starts, 125, 142, 10), [110, 120, 130, 140])
  assert.deepEqual(selectSegments(starts, 1000, 1010, 10), [])
})
