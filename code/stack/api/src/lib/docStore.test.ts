import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DatabaseNotReady, openDatabase } from '../db/database.ts'
import { memoryDatabase } from '../testing/helpers.ts'
import { createDocStore } from './docStore.ts'

test('un document absent lève ENOENT', () => {
  const store = createDocStore(memoryDatabase(), 'zones')
  assert.throws(
    () => store.read(),
    (error: NodeJS.ErrnoException) => error.code === 'ENOENT' && /zones/.test(error.message),
  )
})

test('écrire crée la ligne, réécrire la remplace, chaque clé a la sienne', () => {
  const db = memoryDatabase()
  const zones = createDocStore(db, 'zones', () => 5_500)
  const plan = createDocStore(db, 'plan', () => 9_000)
  zones.write('{"a":1}')
  plan.write('{"b":2}')
  zones.write('{"a":3}')
  assert.equal(zones.read(), '{"a":3}')
  assert.equal(plan.read(), '{"b":2}')
  assert.deepEqual(
    db.all<{ key: string; updated_at: number }>('SELECT key, updated_at FROM house_state ORDER BY key').map((row) => ({ ...row })),
    [
      { key: 'plan', updated_at: 9 },
      { key: 'zones', updated_at: 5 },
    ],
  )
})

test('l’heure est celle de l’horloge par défaut', () => {
  const db = memoryDatabase()
  const before = Math.floor(Date.now() / 1000)
  createDocStore(db, 'k').write('1')
  assert.ok((db.get<{ updated_at: number }>('SELECT updated_at FROM house_state')?.updated_at ?? 0) >= before)
})

test('une base pas prête fait échouer la lecture et l’écriture', () => {
  const store = createDocStore(openDatabase('/introuvable/events.db'), 'k')
  assert.throws(() => store.read(), DatabaseNotReady)
  assert.throws(() => store.write('1'), DatabaseNotReady)
})
