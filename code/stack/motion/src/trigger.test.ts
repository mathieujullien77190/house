// Les tests du déclenchement d'un événement (yeux qui brillent) : node --test.
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createEventStore } from './events.ts'
import { createTrigger, TRIGGER_HOLD_SECONDS, TRIGGER_REASONS } from './trigger.ts'

const setup = () => {
  const store = createEventStore(join(mkdtempSync(join(tmpdir(), 'trigger-')), 'events.json'))
  const clock = { at: 1_000 }
  return { store, clock, trigger: createTrigger(store, () => clock.at) }
}

test('un appel ouvre un événement étiqueté, un second le prolonge au lieu d’en ouvrir un autre', () => {
  const { store, clock, trigger } = setup()
  const first = trigger.fire('cam', TRIGGER_REASONS.eyes)
  assert.equal(first.extended, false)
  assert.deepEqual(
    store.list({ inProgress: true }).map((e) => [e.id, e.label, e.camera, e.end_time]),
    [[first.id, 'eyes', 'cam', null]],
  )
  clock.at += 5
  const second = trigger.fire('cam', 'eyes')
  assert.deepEqual([second.id, second.extended, second.started_at], [first.id, true, 1_000])
  assert.equal(store.list().length, 1)
  // une autre caméra a son propre événement
  assert.notEqual(trigger.fire('other', 'eyes').id, first.id)
})

test('sans nouvel appel pendant le délai, l’événement se ferme à l’instant du dernier appel, puis un appel en ouvre un nouveau', () => {
  const { store, clock, trigger } = setup()
  const first = trigger.fire('cam', 'eyes')
  clock.at += 4
  trigger.fire('cam', 'eyes')
  clock.at += TRIGGER_HOLD_SECONDS
  assert.deepEqual(trigger.tick(), [])
  clock.at += 1
  assert.deepEqual(trigger.tick(), [first.id])
  assert.equal(store.get(first.id)?.end_time, 1_004)
  assert.deepEqual(trigger.tick(), [])
  const next = trigger.fire('cam', 'eyes')
  assert.notEqual(next.id, first.id)
  assert.equal(next.extended, false)
})
