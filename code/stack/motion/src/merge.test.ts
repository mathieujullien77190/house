// Tests de la fusion des clips qui se recouvrent : node --test (npm test).
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import { createEventStore, type MotionRecord } from './events.ts'
import { findMergeGroups } from './merge.ts'

const event = (camera: string, start: number, end: number | null): MotionRecord => ({
  id: `${start}-${camera}`,
  camera,
  label: 'motion',
  start_time: start,
  end_time: end,
  has_clip: true,
})

const margins = { preSeconds: 5, postSeconds: 5, segmentSeconds: 10 }

test('deux clips qui se recouvrent se fusionnent, pas ceux qui sont séparés', () => {
  // Le clip du premier va jusqu'à 110 + 5 + 10 = 125 au plus : un second clip qui commence avant se recouvre.
  const near = [event('perruche-fond', 100, 110), { ...event('perruche-fond', 140, 150), clip_start: 124 }]
  assert.deepEqual(findMergeGroups(near, 10_000, margins, 1800), [['100-perruche-fond', '140-perruche-fond']])
  const far = [event('perruche-fond', 100, 110), { ...event('perruche-fond', 140, 150), clip_start: 126 }]
  assert.deepEqual(findMergeGroups(far, 10_000, margins, 1800), [])
  // Sans début de clip connu, il commence au plus tôt 25 s avant l'événement.
  assert.equal(findMergeGroups([event('perruche-fond', 100, 110), event('perruche-fond', 149, 160)], 10_000, margins, 1800).length, 1)
})

test('une chaîne forme un seul groupe et chaque caméra a ses groupes', () => {
  const events = [event('perruche-fond', 100, 110), event('perruche-fond', 115, 125), event('perruche-fond', 130, 140), event('perruche-porte', 112, 118)]
  assert.deepEqual(findMergeGroups(events, 10_000, margins, 1800), [['100-perruche-fond', '115-perruche-fond', '130-perruche-fond']])
})

test('rien tant que le dernier événement du groupe est trop récent ou encore en cours', () => {
  const events = [event('perruche-fond', 100, 110), event('perruche-fond', 115, 125)]
  assert.deepEqual(findMergeGroups(events, 125 + 1799, margins, 1800), [])
  assert.equal(findMergeGroups(events, 125 + 1800, margins, 1800).length, 1)
  assert.deepEqual(findMergeGroups([event('perruche-fond', 100, 110), event('perruche-fond', 115, null)], 10_000, margins, 1800), [])
})

test('merge garde le premier, étend sa fin et absorbe les autres', () => {
  const store = createEventStore(`${mkdtempSync(`${tmpdir()}/merge-`)}/events.json`)
  const a = store.open('perruche-fond', 100)
  store.close(a.id, 110)
  store.markClip(a.id, 95)
  const b = store.open('perruche-fond', 115)
  store.close(b.id, 125)
  store.markClip(b.id, 110)
  store.merge([a.id, b.id], 5000)
  assert.deepEqual(store.list().map((e) => e.id), [a.id])
  assert.equal(store.get(a.id)?.end_time, 125)
  assert.deepEqual(store.withoutClip().map((e) => e.id), [a.id])
  assert.equal(store.get(b.id)?.merged_into, a.id)
  assert.deepEqual(store.list({ mergedAfter: 4000 }).map((e) => e.id).sort(), [a.id, b.id].sort())
  assert.equal(store.list({ mergedAfter: 6000 }).length, 0)
})
