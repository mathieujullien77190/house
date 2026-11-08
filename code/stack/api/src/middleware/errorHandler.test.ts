import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import type { Request, Response } from 'express'
import { DatabaseNotReady } from '../db/database.ts'
import { errorHandler, notFound } from './errorHandler.ts'

const answer = (work: (res: Response) => void): { status?: number; body?: unknown } => {
  const out: { status?: number; body?: unknown } = {}
  const res = {
    status: (code: number) => {
      out.status = code
      return { json: (body: unknown) => void (out.body = body) }
    },
  } as unknown as Response
  work(res)
  return out
}

const handle = (error: unknown) => answer((res) => errorHandler(error, {} as Request, res, () => undefined))

test('une route inconnue donne 404', () => {
  assert.deepEqual(
    answer((res) => notFound({} as Request, res, () => undefined)),
    { status: 404, body: { error: 'not found' } },
  )
})

test('la base pas prête donne 503', () => {
  assert.deepEqual(handle(new DatabaseNotReady()), { status: 503, body: { error: 'database not ready' } })
})

test('une erreur de lecture du corps garde son statut 4xx', () => {
  assert.deepEqual(handle({ status: 413 }), { status: 413, body: { error: 'bad request' } })
  assert.equal(handle({ status: 400 }).status, 400)
})

test('le reste donne 500 sans détail, et le message est journalisé', () => {
  const log = mock.method(console, 'error', () => undefined)
  try {
    assert.deepEqual(handle(new Error('secret')), { status: 500, body: { error: 'internal error' } })
    assert.equal(handle({ status: 502 }).status, 500)
    assert.equal(handle({ status: 399 }).status, 500)
    assert.equal(handle({ status: '400' }).status, 500)
    assert.equal(handle(null).status, 500)
    assert.deepEqual(
      log.mock.calls.map((call) => call.arguments[0]),
      ['secret', '[object Object]', '[object Object]', '[object Object]', 'null'],
    )
  } finally {
    log.mock.restore()
  }
})
