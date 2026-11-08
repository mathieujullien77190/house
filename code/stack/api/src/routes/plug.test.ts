import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PlugService, PlugState } from '../services/plugService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { plugRouter } from './plug.ts'

const STATE: PlugState = { alias: 'chauffage', model: 'HS100', on: false, rssi: -60, onTime: 0, timerSeconds: null, offOnMotion: false }

const setup = (canWatchMotion = true) => {
  const calls: string[] = []
  const state = { fail: false }
  const plug = {
    canWatchMotion,
    get: async () => {
      if (state.fail) throw new Error('injoignable')
      return STATE
    },
    set: async (on: boolean, watch: boolean) => {
      if (state.fail) throw new Error('injoignable')
      calls.push(`set ${on} ${watch}`)
      return STATE
    },
    startTimer: async (minutes: number, watch: boolean) => {
      if (state.fail) throw new Error('injoignable')
      calls.push(`timer ${minutes} ${watch}`)
      return STATE
    },
  } as unknown as PlugService
  return { app: routerApp(plugRouter(plug)), calls, state }
}

test('sans prise configurée, 503', async () => {
  await withServer(routerApp(plugRouter(null)), async (url) => {
    assert.equal((await call(`${url}/plug`)).status, 503)
    assert.equal((await call(`${url}/plug`, 'POST', { on: false })).status, 503)
  })
})

test('GET /plug : l’état, ou 502 si la prise ne répond pas', async () => {
  const { app, state } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/plug`)).body, STATE)
    state.fail = true
    assert.deepEqual((await call(`${url}/plug`)).status, 502)
  })
})

test('POST /plug : éteindre, ou allumer pour une durée, avec ou sans l’option mouvement', async () => {
  const { app, calls } = setup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/plug`, 'POST', { on: false })).body, STATE)
    await call(`${url}/plug`, 'POST', { on: true, minutes: 15 })
    await call(`${url}/plug`, 'POST', { on: true, minutes: 120, offOnMotion: true })
    await call(`${url}/plug`, 'POST', { on: true, minutes: 1, offOnMotion: false })
    assert.deepEqual(calls, ['set false false', 'timer 15 false', 'timer 120 true', 'timer 1 false'])
  })
})

test('POST /plug : les demandes invalides donnent 400', async () => {
  const { app, calls } = setup()
  await withServer(app, async (url) => {
    const bad = [
      undefined,
      {},
      { on: 'oui' },
      { on: false, minutes: 5 },
      { on: true, minutes: 1.5 },
      { on: true, minutes: 'cinq' },
      { on: true, minutes: 0 },
      { on: true, minutes: 121 },
      { on: true },
      { on: true, minutes: 5, offOnMotion: 'oui' },
      { on: false, offOnMotion: true },
    ]
    for (const body of bad) assert.equal((await call(`${url}/plug`, 'POST', body)).status, 400, JSON.stringify(body))
    assert.deepEqual(calls, [])
  })
})

test('POST /plug : l’option mouvement demande un pont Hue, une prise muette donne 502', async () => {
  const withoutHue = setup(false)
  await withServer(withoutHue.app, async (url) => {
    assert.equal((await call(`${url}/plug`, 'POST', { on: true, minutes: 5, offOnMotion: true })).status, 503)
    assert.equal((await call(`${url}/plug`, 'POST', { on: true, minutes: 5 })).status, 200)
  })
  const { app, state } = setup()
  await withServer(app, async (url) => {
    state.fail = true
    assert.equal((await call(`${url}/plug`, 'POST', { on: false })).status, 502)
    assert.equal((await call(`${url}/plug`, 'POST', { on: true, minutes: 5 })).status, 502)
  })
})
