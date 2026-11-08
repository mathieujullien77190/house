import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { HeatingService } from '../services/heatingService.ts'
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
  return { app: routerApp(plugRouter(plug)), calls, state, plugOnly: plug }
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

/** Un faux chauffage : les réglages, un journal de 3 lignes, et ce qu'on lui a demandé. */
const heatingSetup = (canRule = true) => {
  const asked: number[] = []
  const heating = {
    canRule,
    status: async () => ({ enabled: true, temperature: 1 }),
    update: (body: unknown) => ((body as { minutes?: unknown }).minutes === 'x' ? 'minutes must be an integer' : { enabled: true, ...(body as object) }),
    log: (limit: number) => {
      asked.push(limit)
      return [{ at: 1 }]
    },
  } as unknown as HeatingService
  return { app: routerApp(plugRouter(setup().plugOnly, heating)), asked }
}

test('GET /plug/heating et PUT /plug/heating : l’état de la règle, les réglages, 400 si refusés', async () => {
  const { app } = heatingSetup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/plug/heating`)).body, { enabled: true, temperature: 1 })
    assert.deepEqual((await call(`${url}/plug/heating`, 'PUT', { thresholdC: 2 })).body, { enabled: true, thresholdC: 2 })
    const refused = await call(`${url}/plug/heating`, 'PUT', { minutes: 'x' })
    assert.equal(refused.status, 400)
    assert.deepEqual(refused.body, { error: 'minutes must be an integer' })
    // un PUT sans corps garde tout
    assert.equal((await call(`${url}/plug/heating`, 'PUT')).status, 200)
  })
})

test('GET /plug/log : 50 lignes par défaut, limit de 1 à 500', async () => {
  const { app, asked } = heatingSetup()
  await withServer(app, async (url) => {
    assert.deepEqual((await call(`${url}/plug/log`)).body, [{ at: 1 }])
    assert.equal((await call(`${url}/plug/log?limit=500`)).status, 200)
    assert.equal((await call(`${url}/plug/log?limit=1`)).status, 200)
    assert.deepEqual(asked, [50, 500, 1])
    for (const limit of ['0', '501', 'abc', '1.5', '-2'])
      assert.equal((await call(`${url}/plug/log?limit=${limit}`)).status, 400, limit)
    assert.equal((await call(`${url}/plug/log?limit=1&limit=2`)).status, 400)
  })
})

test('chauffage : 503 sans prise, sans chauffage, ou sans pont Hue pour la règle', async () => {
  await withServer(routerApp(plugRouter(null)), async (url) => {
    for (const path of ['/plug/heating', '/plug/log']) assert.equal((await call(`${url}${path}`)).status, 503)
    assert.equal((await call(`${url}/plug/heating`, 'PUT', {})).status, 503)
  })
  const { app } = heatingSetup(false)
  await withServer(app, async (url) => {
    assert.equal((await call(`${url}/plug/heating`)).status, 503)
    assert.equal((await call(`${url}/plug/heating`, 'PUT', {})).status, 503)
    // le journal reste lisible sans pont Hue
    assert.equal((await call(`${url}/plug/log`)).status, 200)
  })
})
