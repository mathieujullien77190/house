import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Sessions } from '../middleware/session.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { authRouter } from './auth.ts'

test('auth ouvre la session, logout la ferme', async () => {
  const done: string[] = []
  const sessions = { open: () => void done.push('open'), close: () => void done.push('close'), has: () => false } as Sessions
  await withServer(routerApp(authRouter(sessions)), async (url) => {
    assert.deepEqual((await call(`${url}/auth`)).body, { ok: true })
    assert.deepEqual((await call(`${url}/logout`)).body, { ok: true })
    assert.deepEqual(done, ['open', 'close'])
  })
})
