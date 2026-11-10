import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createClipEmojisStore, isEmoji, MAX_EMOJI_LENGTH } from './clipEmojisStore.ts'

test('isEmoji : un pictogramme court, ni lettres ni chiffres', () => {
  for (const good of ['🦊', '🐿️', '👨‍👩‍👧', '🇫🇷']) assert.equal(isEmoji(good), true, good)
  for (const bad of ['', 'renard', 'a🦊', '🦊1', ' ', '🦊'.repeat(MAX_EMOJI_LENGTH)]) assert.equal(isEmoji(bad), false, JSON.stringify(bad))
})

test('poser, remplacer et retirer un emoji', async () => {
  await withTempDir((dir) => {
    const store = createClipEmojisStore(join(dir, 'sub', 'emojis.json'))
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
})

test('un identifiant ou un emoji invalide est refusé', async () => {
  await withTempDir((dir) => {
    const store = createClipEmojisStore(join(dir, 'emojis.json'))
    assert.throws(() => store.set('a b', '🦊'), /identifiant/)
    assert.throws(() => store.set('e1', 'renard'), /emoji invalide/)
    assert.deepEqual(store.all(), {})
  })
})

test('un fichier illisible n’est jamais écrasé ; les entrées invalides sont écartées', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'emojis.json')
    for (const text of ['pas du json', '{"emojis": []}', '{"emojis": 3}', '{}']) {
      writeFileSync(file, text)
      const store = createClipEmojisStore(file)
      assert.deepEqual(store.all(), {})
      assert.throws(() => store.set('e1', '🦊'), /illisibles/)
      assert.equal(readFileSync(file, 'utf8'), text)
    }
    writeFileSync(file, JSON.stringify({ emojis: { ok: '🦊', 'a b': '🦊', bad: 'x', num: 3 } }))
    assert.deepEqual(createClipEmojisStore(file).all(), { ok: '🦊' })
  })
})

test('un dossier illisible rend un fichier illisible', async () => {
  await withTempDir((dir) => {
    const store = createClipEmojisStore(dir)
    assert.deepEqual(store.all(), {})
    assert.throws(() => store.set('e1', '🦊'), /illisibles/)
  })
})
