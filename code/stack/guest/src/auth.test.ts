import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sameSecret } from './auth.ts'

test('la bonne clé passe, une autre non', () => {
  assert.equal(sameSecret('une-cle-assez-longue-123', 'une-cle-assez-longue-123'), true)
  assert.equal(sameSecret('une-autre-cle-assez-longue', 'une-cle-assez-longue-123'), false)
})

test('des textes de longueurs différentes se comparent sans planter', () => {
  assert.equal(sameSecret('a', 'abc'), false)
  assert.equal(sameSecret('', 'abc'), false)
  assert.equal(sameSecret('abc', 'abc'), true)
})
