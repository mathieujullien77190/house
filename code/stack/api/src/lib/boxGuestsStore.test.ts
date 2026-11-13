import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createBoxGuestsStore, type GuestSighting } from './boxGuestsStore.ts'

const sighting = (patch: Partial<GuestSighting> = {}): GuestSighting => ({ mac: 'AA:BB:CC:DD:EE:01', name: 'Tel', ip: '192.168.1.9', type: 'smartphone', vendor: 'X', ...patch })

test('un invité vu entre dans la liste, lastSeen suit, l’écriture est espacée', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'sous', 'box-guests.json')
    const store = createBoxGuestsStore(file)
    assert.deepEqual(store.list(), [])
    store.seen([], 5)
    store.seen([sighting()], 100)
    assert.deepEqual(store.list(), [{ ...sighting(), firstSeen: 100, lastSeen: 100 }])
    // 10 s plus tard : lastSeen en mémoire, pas de nouvelle écriture
    store.seen([sighting()], 110)
    assert.equal(JSON.parse(readFileSync(file, 'utf8'))[0].lastSeen, 100)
    assert.equal(store.list()[0].lastSeen, 110)
    // une minute après : écrit
    store.seen([sighting()], 170)
    assert.equal(JSON.parse(readFileSync(file, 'utf8'))[0].lastSeen, 170)
    // un nom qui change : écrit tout de suite
    store.seen([sighting({ name: 'Tel de Paul', ip: null })], 171)
    const saved = JSON.parse(readFileSync(file, 'utf8'))[0]
    assert.equal(saved.name, 'Tel de Paul')
    assert.equal(saved.firstSeen, 100)
    // un autre démarrage relit le fichier
    assert.equal(createBoxGuestsStore(file).list().length, 1)
  })
})

test('remove retire un invité', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'g.json')
    const store = createBoxGuestsStore(file)
    store.seen([sighting(), sighting({ mac: 'AA:BB:CC:DD:EE:02' })], 1)
    assert.equal(store.remove('AA:BB:CC:DD:EE:09'), false)
    assert.equal(store.remove('AA:BB:CC:DD:EE:01'), true)
    assert.deepEqual(
      JSON.parse(readFileSync(file, 'utf8')).map((g: { mac: string }) => g.mac),
      ['AA:BB:CC:DD:EE:02'],
    )
  })
})

test('fichier abîmé ou entrées fausses', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'g.json')
    writeFileSync(file, 'pas du json')
    assert.deepEqual(createBoxGuestsStore(file).list(), [])
    writeFileSync(file, '{}')
    assert.deepEqual(createBoxGuestsStore(file).list(), [])
    writeFileSync(file, JSON.stringify([null, { mac: 'x' }, { mac: 'AA', firstSeen: 1, lastSeen: 2 }]))
    assert.deepEqual(createBoxGuestsStore(file).list(), [{ mac: 'AA', name: 'AA', ip: null, type: null, vendor: null, firstSeen: 1, lastSeen: 2 }])
  })
})

test('une écriture impossible garde la liste en mémoire', async () => {
  await withTempDir((dir) => {
    const blocker = join(dir, 'fichier')
    writeFileSync(blocker, 'x')
    const store = createBoxGuestsStore(join(blocker, 'g.json'))
    store.seen([sighting()], 1)
    assert.equal(store.list().length, 1)
    assert.equal(store.remove('AA:BB:CC:DD:EE:01'), true)
  })
})
