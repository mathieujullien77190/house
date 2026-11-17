import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDoc } from '../testing/helpers.ts'
import { createClipNotesStore, MAX_NOTE_LENGTH } from './clipNotesStore.ts'

test('poser, remplacer, vider et relire les notes', () => {
  const doc = memoryDoc()
  const store = createClipNotesStore(doc)
  assert.deepEqual(store.all(), {})
  store.set('a.1', '  renard ')
  store.set('b', 'chat')
  store.set('b', 'chien')
  store.set('a.1', '   ')
  assert.deepEqual(store.all(), { b: 'chien' })
  assert.deepEqual(JSON.parse(doc.text() ?? ''), { notes: { b: 'chien' } })
})

test('une note est coupée à la longueur maximale', () => {
  const store = createClipNotesStore(memoryDoc())
  store.set('a', 'x'.repeat(MAX_NOTE_LENGTH + 50))
  assert.equal(store.all().a?.length, MAX_NOTE_LENGTH)
})

test('un identifiant invalide est refusé', () => {
  assert.throws(() => createClipNotesStore(memoryDoc()).set('../x', 'a'), /invalide/)
})

test('un document illisible n’est jamais écrasé', () => {
  const bad = memoryDoc('pas du json')
  const store = createClipNotesStore(bad)
  assert.deepEqual(store.all(), {})
  assert.throws(() => store.set('a', 'x'), /illisibles/)
  assert.equal(bad.text(), 'pas du json')
  for (const text of ['{"notes": 3}', '{"notes": null}', '{"notes": []}']) {
    assert.throws(() => createClipNotesStore(memoryDoc(text)).set('a', 'x'), /illisibles/)
  }
  // une erreur de lecture autre que « absent »
  assert.throws(() => createClipNotesStore(memoryDoc(null, 'EISDIR')).set('a', 'x'), /illisibles/)
})

test('les entrées mal formées du document sont ignorées', () => {
  const doc = memoryDoc(JSON.stringify({ notes: { ok: 'oui', '../mal': 'non', num: 5 } }))
  assert.deepEqual(createClipNotesStore(doc).all(), { ok: 'oui' })
})
