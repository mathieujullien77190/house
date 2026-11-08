import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAttemptLimiter } from './attemptLimiter.ts'

test('une adresse est bloquée après le maximum d’échecs, jusqu’à la fin de la fenêtre', () => {
  let now = 1000
  const limiter = createAttemptLimiter(3, 100, () => now)
  assert.equal(limiter.isBlocked('a'), false)
  limiter.fail('a')
  limiter.fail('a')
  assert.equal(limiter.isBlocked('a'), false)
  limiter.fail('a')
  assert.equal(limiter.isBlocked('a'), true)
  assert.equal(limiter.isBlocked('b'), false)
  now += 101
  assert.equal(limiter.isBlocked('a'), false)
})

test('la bonne clé efface les échecs', () => {
  const limiter = createAttemptLimiter(1, 100, () => 5)
  limiter.fail('a')
  assert.equal(limiter.isBlocked('a'), true)
  limiter.clear('a')
  assert.equal(limiter.isBlocked('a'), false)
})

test('table pleine : la plus ancienne adresse est oubliée, une adresse connue est conservée', () => {
  const limiter = createAttemptLimiter(1, 1000, () => 10)
  for (let index = 0; index < 1000; index += 1) limiter.fail(`ip${index}`)
  // adresse déjà suivie : rien n'est oublié
  limiter.fail('ip5')
  assert.equal(limiter.isBlocked('ip0'), true)
  // adresse nouvelle : ip0, la plus ancienne, sort
  limiter.fail('nouvelle')
  assert.equal(limiter.isBlocked('ip0'), false)
  assert.equal(limiter.isBlocked('ip1'), true)
  assert.equal(limiter.isBlocked('nouvelle'), true)
})

test('les valeurs par défaut : 10 essais', () => {
  const limiter = createAttemptLimiter()
  for (let index = 0; index < 9; index += 1) limiter.fail('a')
  assert.equal(limiter.isBlocked('a'), false)
  limiter.fail('a')
  assert.equal(limiter.isBlocked('a'), true)
})
