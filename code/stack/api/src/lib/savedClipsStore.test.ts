import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDoc } from '../testing/helpers.ts'
import { createSavedClipsStore } from './savedClipsStore.ts'

test('sauvegarder, libérer et relire les identifiants', () => {
  const doc = memoryDoc()
  const store = createSavedClipsStore(doc)
  assert.equal(store.ids().size, 0)
  store.set('a.1', true)
  store.set('b', true)
  store.set('a.1', false)
  assert.deepEqual([...store.ids()], ['b'])
  assert.deepEqual(JSON.parse(doc.text() ?? ''), { ids: ['b'] })
})

test('un identifiant invalide est refusé', () => {
  assert.throws(() => createSavedClipsStore(memoryDoc()).set('../x', true), /invalide/)
})

test('un document illisible n’est jamais écrasé', () => {
  const bad = memoryDoc('pas du json')
  const store = createSavedClipsStore(bad)
  assert.equal(store.ids().size, 0)
  assert.throws(() => store.set('a', true), /illisible/)
  assert.equal(bad.text(), 'pas du json')
  assert.throws(() => createSavedClipsStore(memoryDoc('{"ids": 3}')).set('a', true), /illisible/)
  // une erreur de lecture autre que « absent »
  assert.throws(() => createSavedClipsStore(memoryDoc(null, 'EISDIR')).set('a', true), /illisible/)
})

test('les identifiants mal formés du document sont ignorés', () => {
  const doc = memoryDoc(JSON.stringify({ ids: ['ok', 5, '../mauvais'] }))
  assert.deepEqual([...createSavedClipsStore(doc).ids()], ['ok'])
})
