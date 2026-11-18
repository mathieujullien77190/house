import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLanTokens, TOKEN_SECONDS } from './lanToken.ts'

test('un jeton émis est accepté pendant 60 s, puis refusé', () => {
  let now = 1_000_000
  const tokens = createLanTokens('une-cle-assez-longue', () => now)
  const token = tokens.issue()
  assert.equal(tokens.check(token), true)
  now += TOKEN_SECONDS * 1000
  assert.equal(tokens.check(token), true)
  now += 1000
  assert.equal(tokens.check(token), false)
})

test('la signature dépend de la clé ; les jetons mal formés sont refusés', () => {
  const tokens = createLanTokens('une-cle-assez-longue')
  const other = createLanTokens('une-autre-cle-longue')
  const token = tokens.issue()
  assert.equal(other.check(token), false)
  const [expires] = token.split('.')
  for (const bad of [undefined, 12, '', 'abc', `${expires}.`, `.${'a'.repeat(64)}`, `x${expires}.${'a'.repeat(64)}`, `${expires}.court`, `${expires}.${'a'.repeat(64)}`]) assert.equal(tokens.check(bad), false, String(bad))
  assert.equal(tokens.check(token), true)
})
