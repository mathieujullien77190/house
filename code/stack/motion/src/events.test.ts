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
  const record = events.open('voliere-exterieur', 1000.5)
  assert.equal(record.id, eventId('voliere-exterieur', 1000.5))
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
  for (const at of [100, 200, 300]) events.close(events.open('voliere-exterieur', at).id, at + 5)
  assert.deepEqual(events.list().map((e) => e.start_time), [300, 200, 100])
  assert.deepEqual(events.list({ after: 100, before: 300 }).map((e) => e.start_time), [200])
  assert.equal(events.list({ limit: 1 }).length, 1)
})

test('prune retire les événements trop vieux et le fichier garde le reste', () => {
  const file = `${mkdtempSync(`${tmpdir()}/events-`)}/events.json`
  const events = createEventStore(file)
  events.open('voliere-exterieur', 100)
  events.open('voliere-exterieur', 500)
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

test('closeOrphans ferme au démarrage les événements restés ouverts, et eux seuls', () => {
  const file = `${mkdtempSync(`${tmpdir()}/events-`)}/events.json`
  const first = createEventStore(file)
  const finished = first.open('voliere-exterieur', 1000)
  first.close(finished.id, 1010)
  const ghost = first.open('voliere-exterieur', 2000)
  // Un redémarrage : le détecteur est neuf, mais le fichier garde l'événement ouvert.
  const second = createEventStore(file)
  assert.equal(second.list({ inProgress: true }).length, 1)
  assert.deepEqual(second.closeOrphans().map((e) => e.id), [ghost.id])
  assert.equal(second.list({ inProgress: true }).length, 0)
  assert.equal(second.get(finished.id)?.end_time, 1010)
  assert.equal(second.get(ghost.id)?.end_time, 2000)
  assert.deepEqual(second.withoutClip().map((e) => e.id).sort(), [finished.id, ghost.id].sort())
  assert.equal(createEventStore(file).list({ inProgress: true }).length, 0, 'la fermeture est écrite sur le disque')
  assert.equal(second.closeOrphans().length, 0)
})

test('markAudio note le son d’un clip, et la fusion l’efface (il sera refait avec le clip)', () => {
  const events = store()
  const a = events.open('cam', 100)
  events.close(a.id, 120)
  events.markClip(a.id, 95)
  events.markAudio(a.id)
  assert.equal(events.get(a.id)?.has_audio, true)
  const b = events.open('cam', 130)
  events.close(b.id, 140)
  events.markClip(b.id, 125)
  events.markAudio(b.id)
  events.merge([a.id, b.id], 500)
  assert.equal(events.get(a.id)?.has_audio, undefined)
  assert.equal(events.get(b.id)?.has_audio, undefined)
})
