import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createClipNotesStore, MAX_NOTE_LENGTH } from './clipNotesStore.ts'

test('poser, remplacer, vider et relire les notes', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'sous', 'notes.json')
    const store = createClipNotesStore(file)
    assert.deepEqual(store.all(), {})
    store.set('a.1', '  renard ')
    store.set('b', 'chat')
    store.set('b', 'chien')
    store.set('a.1', '   ')
    assert.deepEqual(store.all(), { b: 'chien' })
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { notes: { b: 'chien' } })
  })
})

test('une note est coupée à la longueur maximale', async () => {
  await withTempDir((dir) => {
    const store = createClipNotesStore(join(dir, 'n.json'))
    store.set('a', 'x'.repeat(MAX_NOTE_LENGTH + 50))
    assert.equal(store.all().a?.length, MAX_NOTE_LENGTH)
  })
})

test('un identifiant invalide est refusé', async () => {
  await withTempDir((dir) => {
    assert.throws(() => createClipNotesStore(join(dir, 'n.json')).set('../x', 'a'), /invalide/)
  })
})

test('un fichier illisible n’est jamais écrasé', async () => {
  await withTempDir((dir) => {
    const bad = join(dir, 'bad.json')
    writeFileSync(bad, 'pas du json')
    const store = createClipNotesStore(bad)
    assert.deepEqual(store.all(), {})
    assert.throws(() => store.set('a', 'x'), /illisibles/)
    assert.equal(readFileSync(bad, 'utf8'), 'pas du json')
    for (const [name, text] of [
      ['no', '{"notes": 3}'],
      ['null', '{"notes": null}'],
      ['arr', '{"notes": []}'],
    ]) {
      const odd = join(dir, `${name}.json`)
      writeFileSync(odd, text!)
      assert.throws(() => createClipNotesStore(odd).set('a', 'x'), /illisibles/)
    }
    const folder = join(dir, 'dossier.json')
    mkdirSync(folder)
    assert.throws(() => createClipNotesStore(folder).set('a', 'x'), /illisibles/)
  })
})

test('les entrées mal formées du fichier sont ignorées', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'n.json')
    writeFileSync(file, JSON.stringify({ notes: { ok: 'oui', '../mal': 'non', num: 5 } }))
    assert.deepEqual(createClipNotesStore(file).all(), { ok: 'oui' })
  })
})
