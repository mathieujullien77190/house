import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { FadeImpossible, UnknownHueId, type HueService } from '../services/hueService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { hueRouter } from './hue.ts'

const setup = () => {
  const state = { error: null as Error | null }
  const calls: string[] = []
  const run = async <T>(name: string, value: T): Promise<T> => {
    calls.push(name)
    if (state.error) throw state.error
    return value
  }
  const hue = {
    list: () => run('list', [{ id: '1' }]),
    automations: () => run('automations', [{ id: 'a' }]),
    sensors: () => run('sensors', [{ id: 's' }]),
    positions: () => ({ '1': { x: 1, y: 2 } }),
    setPositions: (changes: unknown) => {
      if (state.error) throw state.error
      return changes
    },
    setRoom: (id: string, bodyState: unknown) => run(`room ${id} ${JSON.stringify(bodyState)}`, [{ id: 'room' }]),
    setLight: (id: string, bodyState: unknown) => run(`light ${id} ${JSON.stringify(bodyState)}`, [{ id: 'light' }]),
    fade: {
      status: (id: string) => run(`status ${id}`, { fading: false, ends_at: null }),
      cancel: (id: string) => run(`cancel ${id}`, { fading: false, ends_at: null }),
      start: (id: string, minutes: number) => run(`start ${id} ${minutes}`, { fading: true, ends_at: 9 }),
    },
  } as unknown as HueService
  return { app: routerApp(hueRouter(hue)), state, calls }
}

test('sans pont Hue, tout répond 503', async () => {
  await withServer(routerApp(hueRouter(null)), async (url) => {
    for (const [method, path, body] of [
      ['GET', '/hue'],
      ['GET', '/hue/automations'],
      ['GET', '/hue/sensors'],
      ['GET', '/hue/positions'],
      ['PUT', '/hue/positions', { '1': { x: 1, y: 1 } }],
      ['GET', '/hue/lights/1/fade'],
      ['PUT', '/hue/rooms/1', { on: true }],
      ['PUT', '/hue/lights/1', { on: true }],
    ] as [string, string, unknown?][]) {
      assert.equal((await call(`${url}${path}`, method, body)).status, 503, `${method} ${path}`)
    }
  })
})

test('les lectures : pièces, règles, détecteurs, positions', async () => {
  const { app } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/hue`)).body, [{ id: '1' }])
    assert.deepEqual((await call(`${url}/hue/automations`)).body, [{ id: 'a' }])
    assert.deepEqual((await call(`${url}/hue/sensors`)).body, [{ id: 's' }])
    assert.deepEqual((await call(`${url}/hue/positions`)).body, { '1': { x: 1, y: 2 } })
  })
})

test('une panne du pont donne 500', async () => {
  const log = mock.method(console, 'error', () => undefined)
  try {
    const { app, state } = setup()
    state.error = new Error('pont coupé')
    await withServer(app, async (url) => {
      for (const path of ['/hue', '/hue/automations', '/hue/sensors', '/hue/lights/1/fade'])
        assert.equal((await call(`${url}${path}`)).status, 500, path)
      assert.equal((await call(`${url}/hue/positions`, 'PUT', { '1': { x: 1, y: 1 } })).status, 500)
      assert.equal((await call(`${url}/hue/rooms/1`, 'PUT', { on: true })).status, 500)
    })
  } finally {
    log.mock.restore()
  }
})

test('PUT /hue/positions : positions valables ou 400', async () => {
  const { app } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/hue/positions`, 'PUT', { '5': { x: 1.2, y: 2 } })).body, { '5': { x: 1, y: 2 } })
    assert.equal((await call(`${url}/hue/positions`, 'PUT', { lampe: { x: 1, y: 1 } })).status, 400)
    assert.equal((await call(`${url}/hue/positions`, 'PUT')).status, 400)
  })
})

test('PUT /hue/rooms/:id et /hue/lights/:id', async () => {
  const { app, state, calls } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/hue/rooms/3`, 'PUT', { on: true, bri: 100 })).body, [{ id: 'room' }])
    assert.deepEqual((await call(`${url}/hue/lights/4`, 'PUT', { bri: 5 })).body, [{ id: 'light' }])
    assert.deepEqual(calls, ['room 3 {"on":true,"bri":100}', 'light 4 {"bri":5}'])
    assert.equal((await call(`${url}/hue/rooms/3`, 'PUT', { bri: 0 })).status, 400)
    assert.equal((await call(`${url}/hue/lights/4`, 'PUT')).status, 400)
    state.error = new UnknownHueId()
    assert.equal((await call(`${url}/hue/lights/4`, 'PUT', { on: true })).status, 404)
  })
})

test('l’extinction en douceur : état, démarrage, annulation', async () => {
  const { app, state, calls } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/hue/lights/1/fade`)).body, { fading: false, ends_at: null })
    assert.deepEqual((await call(`${url}/hue/lights/1/fade`, 'DELETE')).body, { fading: false, ends_at: null })
    // 15 minutes par défaut, sans corps ou avec un corps vide
    assert.deepEqual((await call(`${url}/hue/lights/1/fade`, 'POST')).body, { fading: true, ends_at: 9 })
    await call(`${url}/hue/lights/1/fade`, 'POST', { minutes: 60 })
    await call(`${url}/hue/lights/1/fade`, 'POST', { minutes: 1 })
    assert.deepEqual(calls, ['status 1', 'cancel 1', 'start 1 15', 'start 1 60', 'start 1 1'])

    assert.equal((await call(`${url}/hue/lights/1/fade`, 'PATCH', {})).status, 405)
    for (const minutes of [0, 61, 'dix', null, Number.MAX_SAFE_INTEGER * 10]) {
      assert.equal((await call(`${url}/hue/lights/1/fade`, 'POST', { minutes })).status, 400, String(minutes))
    }
    state.error = new UnknownHueId()
    assert.deepEqual((await call(`${url}/hue/lights/1/fade`)).body, { error: 'unknown id' })
    state.error = new FadeImpossible()
    assert.equal((await call(`${url}/hue/lights/1/fade`, 'POST', {})).status, 409)
  })
})
