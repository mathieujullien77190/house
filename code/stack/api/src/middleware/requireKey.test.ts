import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Request, Response } from 'express'
import { createAttemptLimiter } from '../lib/attemptLimiter.ts'
import { createKeyCheck, createRequireKey, KEY_HEADER } from './requireKey.ts'
import type { Sessions } from './session.ts'

const KEY = 'une-cle-assez-longue'

const request = (key?: string, ip: string | null = '1.1.1.1'): Request =>
  ({ ip, header: (name: string) => (name === KEY_HEADER ? key : undefined) }) as unknown as Request

const sessions = (open: boolean): Sessions => ({ has: () => open, open: () => undefined, close: () => undefined })

/** Lance le middleware et rend ce qu'il a fait : next appelé, ou le statut et le corps répondus. */
const run = (handler: ReturnType<typeof createRequireKey>, req: Request): { next: boolean; status?: number; body?: unknown } => {
  const out: { next: boolean; status?: number; body?: unknown } = { next: false }
  const res = {
    status: (code: number) => {
      out.status = code
      return { json: (body: unknown) => void (out.body = body) }
    },
  } as unknown as Response
  handler(req, res, () => void (out.next = true))
  return out
}

test('la vérification de la clé compare la longueur puis le contenu', () => {
  const check = createKeyCheck(KEY)
  assert.equal(check(request(KEY)), true)
  assert.equal(check(request(undefined)), false)
  assert.equal(check(request('court')), false)
  assert.equal(check(request('x'.repeat(KEY.length))), false)
})

test('une session valable passe sans clé', () => {
  assert.equal(run(createRequireKey(KEY, sessions(true)), request()).next, true)
})

test('la bonne clé passe et efface les échecs, même depuis une adresse bloquée', () => {
  const limiter = createAttemptLimiter(1, 1000, () => 1)
  const handler = createRequireKey(KEY, sessions(false), limiter)
  assert.equal(run(handler, request('mauvaise')).status, 401)
  assert.equal(run(handler, request('mauvaise')).status, 429)
  assert.equal(run(handler, request(KEY)).next, true)
  assert.equal(limiter.isBlocked('1.1.1.1'), false)
})

test('une mauvaise clé donne 401 puis 429 au-delà du maximum', () => {
  const handler = createRequireKey(
    KEY,
    sessions(false),
    createAttemptLimiter(2, 1000, () => 1),
  )
  assert.deepEqual(run(handler, request('a')), { next: false, status: 401, body: { error: 'invalid key' } })
  assert.equal(run(handler, request('b')).status, 401)
  assert.deepEqual(run(handler, request('c')), { next: false, status: 429, body: { error: 'too many attempts' } })
})

test('un en-tête vide ou absent n’est pas un essai de clé ; sans adresse, la clé reste vérifiée', () => {
  const limiter = createAttemptLimiter(1, 1000, () => 1)
  const handler = createRequireKey(KEY, sessions(false), limiter)
  assert.equal(run(handler, request('')).status, 401)
  assert.equal(run(handler, request('')).status, 401)
  assert.equal(run(handler, request(undefined)).status, 401)
  assert.equal(limiter.isBlocked('1.1.1.1'), false)
  assert.equal(run(handler, request('mauvaise', null)).status, 401)
  assert.equal(limiter.isBlocked(''), true)
})

test('par défaut, le limiteur est créé par le middleware', () => {
  const handler = createRequireKey(KEY, sessions(false))
  assert.equal(run(handler, request('mauvaise')).status, 401)
})
