import assert from 'node:assert/strict'
import { test } from 'node:test'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { guestRouter } from './guest.ts'

test('guest : le lien de la page invité, ou 503', async () => {
  await withServer(routerApp(guestRouter({ key: 'k', port: 8090, url: '' })), async (url) => {
    assert.deepEqual((await call(`${url}/guest`)).body, { key: 'k', port: 8090, url: '' })
  })
  await withServer(routerApp(guestRouter(null)), async (url) => {
    assert.equal((await call(`${url}/guest`)).status, 503)
  })
})
