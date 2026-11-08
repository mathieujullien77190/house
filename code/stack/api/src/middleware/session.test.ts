import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Request, Response } from 'express'
import { createSessions, createToken, isValidToken, SESSION_COOKIE, SESSION_SECONDS } from './session.ts'

const KEY = 'une-cle-assez-longue'

test('un jeton signé est valable jusqu’à sa fin, pas après', () => {
  const token = createToken(KEY, 1000)
  assert.equal(isValidToken(KEY, token, 1000), true)
  assert.equal(isValidToken(KEY, token, 1000 + SESSION_SECONDS - 1), true)
  assert.equal(isValidToken(KEY, token, 1000 + SESSION_SECONDS), false)
})

test('un jeton mal formé, signé avec une autre clé ou falsifié est refusé', () => {
  const token = createToken(KEY, 1000)
  const [expires, mac] = token.split('.')
  assert.equal(isValidToken(KEY, '', 0), false)
  assert.equal(isValidToken(KEY, 'abc.def', 0), false)
  assert.equal(isValidToken(KEY, '1.5.x', 0), false)
  assert.equal(isValidToken(KEY, `${expires}`, 0), false)
  assert.equal(isValidToken(KEY, `${expires}.court`, 0), false)
  assert.equal(isValidToken(KEY, `${expires}.${'0'.repeat(mac.length)}`, 0), false)
  assert.equal(isValidToken('autre-cle-longue', token, 0), false)
})

const requestWith = (cookie?: string): Request => ({ headers: cookie === undefined ? {} : { cookie } }) as unknown as Request

test('la session lit son cookie parmi les autres', () => {
  const sessions = createSessions(KEY)
  const now = Math.floor(Date.now() / 1000)
  const token = createToken(KEY, now)
  assert.equal(sessions.has(requestWith()), false)
  assert.equal(sessions.has(requestWith('autre=1')), false)
  assert.equal(sessions.has(requestWith(`autre=1; ${SESSION_COOKIE}=${token}`)), true)
  assert.equal(sessions.has(requestWith(`${SESSION_COOKIE}=${createToken(KEY, now - SESSION_SECONDS - 5)}`)), false)
})

test('ouvrir et fermer posent le cookie', () => {
  const headers: Record<string, string> = {}
  const res = { setHeader: (name: string, value: string) => void (headers[name] = value) } as unknown as Response
  const sessions = createSessions(KEY)
  sessions.open(res)
  assert.match(
    headers['Set-Cookie'],
    new RegExp(`^${SESSION_COOKIE}=\\d+\\.[0-9a-f]+; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax$`),
  )
  sessions.close(res)
  assert.equal(headers['Set-Cookie'], `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`)
})
