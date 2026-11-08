import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { createSavedClipsStore } from './savedClipsStore.ts'

test('sauvegarder, libérer et relire les identifiants', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'sous', 'saved.json')
    const store = createSavedClipsStore(file)
    assert.equal(store.ids().size, 0)
    store.set('a.1', true)
    store.set('b', true)
    store.set('a.1', false)
    assert.deepEqual([...store.ids()], ['b'])
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { ids: ['b'] })
  })
})

test('un identifiant invalide est refusé', async () => {
  await withTempDir((dir) => {
    assert.throws(() => createSavedClipsStore(join(dir, 's.json')).set('../x', true), /invalide/)
  })
})

test('un fichier illisible n’est jamais écrasé', async () => {
  await withTempDir((dir) => {
    const bad = join(dir, 'bad.json')
    writeFileSync(bad, 'pas du json')
    const store = createSavedClipsStore(bad)
    assert.equal(store.ids().size, 0)
    assert.throws(() => store.set('a', true), /illisible/)
    assert.equal(readFileSync(bad, 'utf8'), 'pas du json')

    const noIds = join(dir, 'noids.json')
    writeFileSync(noIds, '{"ids": 3}')
    assert.throws(() => createSavedClipsStore(noIds).set('a', true), /illisible/)

    // un dossier à la place du fichier : erreur de lecture autre que « absent »
    const folder = join(dir, 'dossier.json')
    mkdirSync(folder)
    assert.throws(() => createSavedClipsStore(folder).set('a', true), /illisible/)
  })
})

test('les identifiants mal formés du fichier sont ignorés', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 's.json')
    writeFileSync(file, JSON.stringify({ ids: ['ok', 5, '../mauvais'] }))
    assert.deepEqual([...createSavedClipsStore(file).ids()], ['ok'])
  })
})
