import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createBoxKnownStore, normalizeMac } from './boxKnownStore.ts'

const phone = { mac: 'AA:BB:CC:DD:EE:01', name: 'Tel', ip: '192.168.1.5' }

test('normalizeMac : majuscules avec deux-points, ou null', () => {
  assert.equal(normalizeMac('aa-bb-cc-dd-ee-ff'), 'AA:BB:CC:DD:EE:FF')
  assert.equal(normalizeMac(' aabbccddeeff '), 'AA:BB:CC:DD:EE:FF')
  assert.equal(normalizeMac('AA:BB'), null)
  assert.equal(normalizeMac(5), null)
})

test('la liste n’existe pas, est écrite une fois, puis jamais écrasée', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'sous', 'box-known.json')
    const store = createBoxKnownStore(file)
    assert.equal(store.list(), null)
    assert.equal(store.add(phone), null)
    assert.equal(store.init([phone]), true)
    assert.equal(store.init([]), false)
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), [phone])
    // un autre démarrage relit le fichier et ne l'écrase pas
    const again = createBoxKnownStore(file)
    assert.equal(again.init([]), false)
    assert.deepEqual(again.list(), [phone])
  })
})

test('add ajoute sans doublon', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'known.json')
    const store = createBoxKnownStore(file)
    store.init([phone])
    const tv = { mac: 'AA:BB:CC:DD:EE:02', name: 'TV', ip: null }
    assert.deepEqual(store.add(tv), [phone, tv])
    assert.deepEqual(store.add(tv), [phone, tv])
    assert.equal(createBoxKnownStore(file).list()?.length, 2)
  })
})

test('fichier abîmé ou entrées fausses', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'known.json')
    writeFileSync(file, 'pas du json')
    assert.equal(createBoxKnownStore(file).list(), null)
    writeFileSync(file, '{}')
    assert.equal(createBoxKnownStore(file).list(), null)
    writeFileSync(file, JSON.stringify([null, { mac: 'x' }, { mac: 'aa:bb:cc:dd:ee:03' }, { mac: 'aa:bb:cc:dd:ee:04', name: 'N', ip: '1.2.3.4' }]))
    assert.deepEqual(createBoxKnownStore(file).list(), [
      { mac: 'AA:BB:CC:DD:EE:03', name: 'AA:BB:CC:DD:EE:03', ip: null },
      { mac: 'AA:BB:CC:DD:EE:04', name: 'N', ip: '1.2.3.4' },
    ])
  })
})

test('remove retire un appareil, garde la liste si la MAC n’y est pas, null sans liste de départ', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'known.json')
    const store = createBoxKnownStore(file)
    assert.equal(store.remove(phone.mac), null)
    const tv = { mac: 'AA:BB:CC:DD:EE:02', name: 'TV', ip: null }
    store.init([phone, tv])
    assert.deepEqual(store.remove('AA:BB:CC:DD:EE:99'), [phone, tv])
    assert.deepEqual(store.remove(phone.mac), [tv])
    assert.deepEqual(createBoxKnownStore(file).list(), [tv])
  })
})
