import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Request, Response } from 'express'
import { createAttemptLimiter } from '../lib/attemptLimiter.ts'
import { createLanTokens } from '../lib/lanToken.ts'
import { createLanGuard, LAN_KEY_HEADER } from './lanGuard.ts'

const KEY = 'une-cle-assez-longue'
const WRONG = 'mauvaise-cle-assez-longue'

type Guard = ReturnType<ReturnType<typeof createLanGuard>>

/** Joue la garde avec une fausse requête : le code rendu, ou « next » si elle laisse passer. */
const run = (guard: Guard, peer: string | undefined, headers: Record<string, string> = {}, query: Record<string, unknown> = {}): string => {
  let result = 'aucun'
  const req = { socket: { remoteAddress: peer }, query, header: (name: string) => headers[name.toLowerCase()] } as unknown as Request
  const res = { status: (code: number) => ({ json: () => void (result = String(code)) }) } as unknown as Response
  guard(req, res, () => void (result = 'next'))
  return result
}

const setup = (key = KEY) => {
  const tokens = createLanTokens(key)
  const limiter = createAttemptLimiter(2)
  return { tokens, limiter, guard: createLanGuard({ key, prefixes: [], tokens, limiter }) }
}

test('sans clé configurée ou trop courte : 503', () => {
  assert.equal(run(setup('').guard(), '127.0.0.1'), '503')
  assert.equal(run(setup('courte').guard(), '127.0.0.1'), '503')
})

test('hors du réseau local, ou sans adresse : 403', () => {
  const { guard } = setup()
  assert.equal(run(guard(), '8.8.8.8', { [LAN_KEY_HEADER]: KEY }), '403')
  assert.equal(run(guard(), undefined, { [LAN_KEY_HEADER]: KEY }), '403')
})

test('la bonne clé passe, la mauvaise ou absente : 401', () => {
  const { guard } = setup()
  assert.equal(run(guard(), '192.168.1.9', { [LAN_KEY_HEADER]: KEY }), 'next')
  assert.equal(run(guard(), '192.168.1.9', { [LAN_KEY_HEADER]: WRONG }), '401')
  assert.equal(run(guard(), '192.168.1.9', { [LAN_KEY_HEADER]: 'courte' }), '401')
  assert.equal(run(guard(), '192.168.1.9'), '401')
})

test('trop d’essais ratés : 429, mais la bonne clé passe toujours et remet le compte à zéro', () => {
  const { guard } = setup()
  const wrong = { [LAN_KEY_HEADER]: WRONG }
  assert.equal(run(guard(), '10.0.0.2', wrong), '401')
  assert.equal(run(guard(), '10.0.0.2', wrong), '401')
  assert.equal(run(guard(), '10.0.0.2', wrong), '429')
  assert.equal(run(guard(), '10.0.0.2'), '401')
  assert.equal(run(guard(), '10.0.0.2', { [LAN_KEY_HEADER]: KEY }), 'next')
  assert.equal(run(guard(), '10.0.0.2', wrong), '401')
})

test('un jeton court passe seulement quand la route l’autorise', () => {
  const { guard, tokens } = setup()
  const token = tokens.issue()
  assert.equal(run(guard(true), '10.0.0.2', {}, { t: token }), 'next')
  assert.equal(run(guard(true), '10.0.0.2', {}, { t: 'faux' }), '401')
  assert.equal(run(guard(), '10.0.0.2', {}, { t: token }), '401')
  assert.equal(run(guard(true), '8.8.8.8', {}, { t: token }), '403')
})

test('sans limiteur fourni, la garde en crée un', () => {
  const guard = createLanGuard({ key: KEY, prefixes: [], tokens: createLanTokens(KEY) })()
  assert.equal(run(guard, '10.0.0.2', { [LAN_KEY_HEADER]: KEY }), 'next')
})
