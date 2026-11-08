// Tests de la liste des clips sauvegardés.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { readSavedIds } from './savedClips.ts'
import { tempDir } from './testing.ts'

const dir = tempDir()

test('dossier non monté : null (rien ne sera effacé)', async () => {
  assert.equal(await readSavedIds(`${dir}/absent/saved.json`), null)
})

test('fichier absent dans un dossier qui existe : aucun clip sauvegardé', async () => {
  assert.deepEqual(await readSavedIds(`${dir}/saved.json`), new Set())
})

test('fichier lu : les identifiants texte seulement', async () => {
  writeFileSync(`${dir}/saved.json`, JSON.stringify({ ids: ['a', 3, 'b'] }))
  assert.deepEqual(await readSavedIds(`${dir}/saved.json`), new Set(['a', 'b']))
})

test('fichier abîmé ou sans liste : null', async () => {
  writeFileSync(`${dir}/saved.json`, '{pas du json')
  assert.equal(await readSavedIds(`${dir}/saved.json`), null)
  writeFileSync(`${dir}/saved.json`, '{"ids": "non"}')
  assert.equal(await readSavedIds(`${dir}/saved.json`), null)
})

test("un fichier illisible pour une autre raison qu'absent : null", async () => {
  mkdirSync(`${dir}/dossier.json`)
  assert.equal(await readSavedIds(`${dir}/dossier.json`), null)
})
