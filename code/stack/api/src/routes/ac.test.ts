import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AcPatch } from '../lib/mitsubishiClient.ts'
import { UnknownAcUnit, type AcService } from '../services/acService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { acRouter } from './ac.ts'

const setup = () => {
  const patches: AcPatch[] = []
  const fail = { error: null as Error | null }
  const ac = {
    state: async () => [{ id: 'salon', name: 'Salon', reachable: true }],
    update: async (id: string, patch: AcPatch) => {
      if (fail.error) throw fail.error
      if (id === 'cave') throw new UnknownAcUnit(id)
      patches.push(patch)
      return { id, name: 'Salon', reachable: true }
    },
  } as unknown as AcService
  return { ac, patches, fail }
}

test('sans unité, 503', async () => {
  await withServer(routerApp(acRouter(null)), async (url) => {
    assert.equal((await call(`${url}/ac`)).status, 503)
    assert.equal((await call(`${url}/ac/salon`, 'POST', { on: true })).status, 503)
  })
})

test('la liste des unités', async () => {
  const { ac } = setup()
  await withServer(routerApp(acRouter(ac)), async (url) => {
    const reply = await call(`${url}/ac`)
    assert.equal(reply.status, 200)
    assert.deepEqual(reply.body, { units: [{ id: 'salon', name: 'Salon', reachable: true }] })
  })
})

test('un changement : chaque réglage valide, plusieurs à la fois', async () => {
  const { ac, patches } = setup()
  await withServer(routerApp(acRouter(ac)), async (url) => {
    for (const body of [{ on: true }, { mode: 'cool' }, { temperature: 21.5 }, { fan: 'quiet' }, { vane: 'swing' }, { wideVane: 'right-center' }, { on: false, temperature: 16 }]) {
      assert.equal((await call(`${url}/ac/salon`, 'POST', body)).status, 200, JSON.stringify(body))
    }
    assert.deepEqual(patches, [{ power: true }, { mode: 'cool' }, { temperature: 21.5 }, { fan: 'quiet' }, { vane: 'swing' }, { wideVane: 'right-center' }, { power: false, temperature: 16 }])
  })
})

test('un corps vide ou faux : 400', async () => {
  const { ac, patches } = setup()
  await withServer(routerApp(acRouter(ac)), async (url) => {
    assert.equal((await call(`${url}/ac/salon`, 'POST')).status, 400)
    for (const body of [{}, { on: 'oui' }, { mode: 'froid' }, { fan: 3 }, { vane: 9 }, { wideVane: 'haut' }, { temperature: 15 }, { temperature: 32 }, { temperature: 20.3 }, { temperature: '20' }, { inconnu: 1 }]) {
      assert.equal((await call(`${url}/ac/salon`, 'POST', body)).status, 400, JSON.stringify(body))
    }
    assert.deepEqual(patches, [])
  })
})

test('une unité inconnue : 404 ; un module muet : 502', async () => {
  const { ac, fail } = setup()
  await withServer(routerApp(acRouter(ac)), async (url) => {
    assert.equal((await call(`${url}/ac/cave`, 'POST', { on: true })).status, 404)
    fail.error = new Error('hors ligne')
    assert.equal((await call(`${url}/ac/salon`, 'POST', { on: true })).status, 502)
  })
})
