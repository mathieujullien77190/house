// Tests de la session par cookie.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createToken, isValidToken, SESSION_SECONDS, sessionCookie } from './session.ts'

test('un jeton est valable 30 jours, avec sa clé seulement', () => {
  const token = createToken('cle-secrete', 1000)
  assert.equal(isValidToken('cle-secrete', token, 1000), true)
  assert.equal(isValidToken('cle-secrete', token, 1000 + SESSION_SECONDS - 1), true)
  assert.equal(isValidToken('cle-secrete', token, 1000 + SESSION_SECONDS), false)
  assert.equal(isValidToken('autre-cle', token, 1000), false)
})

test('un jeton abîmé est refusé', () => {
  assert.equal(isValidToken('k', '', 0), false)
  assert.equal(isValidToken('k', 'abc.def', 0), false)
  assert.equal(isValidToken('k', '99999999999', 0), false)
  assert.equal(isValidToken('k', '99999999999.court', 0), false)
})

test("le cookie s'ouvre avec un jeton et se ferme sans", () => {
  assert.match(sessionCookie('s', 'tok'), /^s=tok; Path=\/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax$/)
  assert.match(sessionCookie('s', ''), /^s=; Path=\/; Max-Age=0;/)
})
