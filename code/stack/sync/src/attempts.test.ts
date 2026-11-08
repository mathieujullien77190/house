// Tests de la limite d'essais de clé ratés : node --test.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAttemptLimiter } from './attempts.ts'
import { clock } from './testing.ts'

test("au dernier échec permis, l'adresse est mise de côté jusqu'à la fin de la fenêtre", () => {
  const time = clock(0)
  const limiter = createAttemptLimiter(3, 1000, time.now)
  assert.equal(limiter.isBlocked('a'), false)
  for (let i = 0; i < 3; i += 1) limiter.fail('a')
  assert.equal(limiter.isBlocked('a'), true)
  assert.equal(limiter.isBlocked('b'), false)
  time.advance(1001)
  assert.equal(limiter.isBlocked('a'), false)
})

test('une connexion réussie efface les échecs', () => {
  const limiter = createAttemptLimiter(2, 1000, clock(0).now)
  limiter.fail('a')
  limiter.fail('a')
  limiter.clear('a')
  assert.equal(limiter.isBlocked('a'), false)
})

test('table pleine : la plus ancienne adresse est oubliée, pas toutes', () => {
  const limiter = createAttemptLimiter(1, 1000, clock(0).now)
  for (let i = 0; i < 1000; i += 1) limiter.fail(`ip${i}`)
  limiter.fail('nouvelle')
  assert.equal(limiter.isBlocked('ip0'), false)
  assert.equal(limiter.isBlocked('ip1'), true)
  assert.equal(limiter.isBlocked('nouvelle'), true)
  // Une adresse déjà connue ne chasse personne.
  limiter.fail('ip1')
  assert.equal(limiter.isBlocked('ip2'), true)
})

test('les valeurs par défaut : 10 échecs en 15 minutes, horloge réelle', () => {
  const limiter = createAttemptLimiter()
  for (let i = 0; i < 9; i += 1) limiter.fail('a')
  assert.equal(limiter.isBlocked('a'), false)
  limiter.fail('a')
  assert.equal(limiter.isBlocked('a'), true)
})
