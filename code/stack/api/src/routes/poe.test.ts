import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { UnknownCamera, type PoeService } from '../services/poeService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { poeRouter } from './poe.ts'

const POWER = { camera: 'cam1', port: 2, on: true, powered: true, watts: 5, streaming: true }

const setup = () => {
  const state = { error: null as Error | null }
  const poe = {
    list: async () => {
      if (state.error) throw state.error
      return [POWER]
    },
    set: async (camera: string, on: boolean) => {
      if (state.error) throw state.error
      return { ...POWER, camera, on }
    },
  } as unknown as PoeService
  return { app: routerApp(poeRouter(poe)), state }
}

test('sans switch configuré, 503', async () => {
  await withServer(routerApp(poeRouter(null)), async (url) => {
    assert.equal((await call(`${url}/poe`)).status, 503)
    assert.equal((await call(`${url}/poe/cam1`, 'POST', { on: true })).status, 503)
  })
})

test('GET /poe et POST /poe/:camera', async () => {
  const { app } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/poe`)).body, [POWER])
    assert.deepEqual((await call(`${url}/poe/cam1`, 'POST', { on: false })).body, { ...POWER, on: false })
    assert.equal((await call(`${url}/poe/cam1`, 'POST', { on: 'non' })).status, 400)
    assert.equal((await call(`${url}/poe/cam1`, 'POST')).status, 400)
  })
})

test('caméra inconnue : 404 ; panne du switch : 500', async () => {
  const log = mock.method(console, 'error', () => undefined)
  try {
    const { app, state } = setup()
    await withServer(app, async (url) => {
      state.error = new UnknownCamera('x')
      assert.equal((await call(`${url}/poe/x`, 'POST', { on: true })).status, 404)
      state.error = new Error('switch coupé')
      assert.equal((await call(`${url}/poe/x`, 'POST', { on: true })).status, 500)
      assert.equal((await call(`${url}/poe`)).status, 500)
    })
  } finally {
    log.mock.restore()
  }
})
