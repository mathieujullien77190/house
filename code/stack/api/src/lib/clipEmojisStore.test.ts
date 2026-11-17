import assert from 'node:assert/strict'
import { test } from 'node:test'
import { memoryDoc } from '../testing/helpers.ts'
import { createClipEmojisStore, isEmoji, MAX_EMOJI_LENGTH } from './clipEmojisStore.ts'

test('isEmoji : un pictogramme court, ni lettres ni chiffres', () => {
  for (const good of ['🦊', '🐿️', '👨‍👩‍👧', '🇫🇷']) assert.equal(isEmoji(good), true, good)
  for (const bad of ['', 'renard', 'a🦊', '🦊1', ' ', '🦊'.repeat(MAX_EMOJI_LENGTH)]) assert.equal(isEmoji(bad), false, JSON.stringify(bad))
})

test('poser, remplacer et retirer un emoji', () => {
  const store = createClipEmojisStore(memoryDoc())
  assert.deepEqual(store.all(), {})
  store.set('e1', '🦊')
  store.set('e2', '🐦')
  store.set('e1', '🦌')
  assert.deepEqual(store.all(), { e1: '🦌', e2: '🐦' })
  store.set('e1', null)
  assert.deepEqual(store.all(), { e2: '🐦' })
  store.set('absent', null)
  assert.deepEqual(store.all(), { e2: '🐦' })
})

test('un identifiant ou un emoji invalide est refusé', () => {
  const store = createClipEmojisStore(memoryDoc())
  assert.throws(() => store.set('a b', '🦊'), /identifiant/)
  assert.throws(() => store.set('e1', 'renard'), /emoji invalide/)
  assert.deepEqual(store.all(), {})
})

test('un document illisible n’est jamais écrasé ; les entrées invalides sont écartées', () => {
  for (const text of ['pas du json', '{"emojis": []}', '{"emojis": 3}', '{}']) {
    const doc = memoryDoc(text)
    const store = createClipEmojisStore(doc)
    assert.deepEqual(store.all(), {})
    assert.throws(() => store.set('e1', '🦊'), /illisibles/)
    assert.equal(doc.text(), text)
  }
  const doc = memoryDoc(JSON.stringify({ emojis: { ok: '🦊', 'a b': '🦊', bad: 'x', num: 3 } }))
  assert.deepEqual(createClipEmojisStore(doc).all(), { ok: '🦊' })
})

test('une erreur de lecture rend un document illisible', () => {
  const store = createClipEmojisStore(memoryDoc(null, 'EISDIR'))
  assert.deepEqual(store.all(), {})
  assert.throws(() => store.set('e1', '🦊'), /illisibles/)
})
