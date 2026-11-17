// Tests de la liste des clips sauvegardés.
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createHouseStateTable } from './houseState.ts'
import { readSavedIds } from './savedClips.ts'
import { putState } from './testing.ts'

const memory = () => {
  const db = new DatabaseSync(':memory:')
  createHouseStateTable(db)
  return db
}

test('table absente (base illisible) : null (rien ne sera effacé)', () => {
  assert.equal(readSavedIds(new DatabaseSync(':memory:')), null)
})

test('document absent : aucun clip sauvegardé', () => {
  assert.deepEqual(readSavedIds(memory()), new Set())
})

test('document lu : les identifiants texte seulement', () => {
  const db = memory()
  putState(db, 'saved-clips', JSON.stringify({ ids: ['a', 3, 'b'] }))
  assert.deepEqual(readSavedIds(db), new Set(['a', 'b']))
})

test('document abîmé ou sans liste : null', () => {
  const db = memory()
  putState(db, 'saved-clips', '{pas du json')
  assert.equal(readSavedIds(db), null)
  putState(db, 'saved-clips', '{"ids": "non"}')
  assert.equal(readSavedIds(db), null)
})
