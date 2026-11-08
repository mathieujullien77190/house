import assert from 'node:assert/strict'
import { test } from 'node:test'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { welcomeRouter } from './welcome.ts'

test('welcome dit que l’API est là', async () => {
  await withServer(routerApp(welcomeRouter()), async (url) => {
    const reply = await call(`${url}/welcome`)
    const body = reply.body as { service: string; message: string; time: string }
    assert.equal(body.service, 'house-api')
    assert.equal(body.message, 'Welcome to House API')
    assert.ok(!Number.isNaN(Date.parse(body.time)))
  })
})
