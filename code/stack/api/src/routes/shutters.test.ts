import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ShuttersAuto } from '../services/shuttersAutoService.ts'
import { UnknownShutter, type ShuttersService } from '../services/shuttersService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { shuttersRouter } from './shutters.ts'

const setup = () => {
  const calls: string[] = []
  const fail = { error: null as Error | null }
  const shutters = {
    state: () => ({
      mock: true,
      shutters: [
        { id: '1', name: 'Salon', lastCommand: null, lastAt: null },
        { id: '2', name: 'Chambre', lastCommand: 'up', lastAt: 5 },
      ],
    }),
    command: async (id: string, command: string) => {
      if (fail.error) throw fail.error
      if (id === '9') throw new UnknownShutter(id)
      calls.push(`${id} ${command}`)
      return { id, name: 'Salon', lastCommand: command, lastAt: 7 }
    },
  } as unknown as ShuttersService
  const auto = {
    state: () => ({ '1': { open: true, close: false } }),
    setOptions: (id: string, patch: { open?: boolean; close?: boolean }) => {
      if (id === '2') return false
      calls.push(`auto ${id} ${JSON.stringify(patch)}`)
      return true
    },
  } as unknown as ShuttersAuto
  return { shutters, auto, calls, fail }
}

const autos = (body: unknown): unknown[] => (body as { shutters: { auto: unknown }[] }).shutters.map((shutter) => shutter.auto)

test('sans volets, 503', async () => {
  await withServer(routerApp(shuttersRouter(null)), async (url) => {
    assert.equal((await call(`${url}/shutters`)).status, 503)
    assert.equal((await call(`${url}/shutters/1`, 'POST', { command: 'up' })).status, 503)
    assert.equal((await call(`${url}/shutters/1/auto`, 'PUT', { open: true })).status, 503)
  })
})

test('GET /shutters : auto pour les volets qui l’ont, null sinon', async () => {
  const { shutters, auto } = setup()
  await withServer(routerApp(shuttersRouter(shutters, auto)), async (url) => {
    const reply = await call(`${url}/shutters`)
    assert.equal((reply.body as { mock: boolean }).mock, true)
    assert.deepEqual(autos(reply.body), [{ open: true, close: false }, null])
  })
  await withServer(routerApp(shuttersRouter(shutters)), async (url) => {
    assert.deepEqual(autos((await call(`${url}/shutters`)).body), [null, null])
  })
})

test('POST /shutters/:id : 400, 404, 502, ok', async () => {
  const { shutters, auto, calls, fail } = setup()
  await withServer(routerApp(shuttersRouter(shutters, auto)), async (url) => {
    assert.equal((await call(`${url}/shutters/1`, 'POST', { command: 'sauter' })).status, 400)
    assert.equal((await call(`${url}/shutters/1`, 'POST', { command: 3 })).status, 400)
    assert.equal((await call(`${url}/shutters/1`, 'POST', {})).status, 400)
    assert.equal((await call(`${url}/shutters/9`, 'POST', { command: 'up' })).status, 404)
    const ok = await call(`${url}/shutters/1`, 'POST', { command: 'down' })
    assert.deepEqual([ok.status, ok.body], [200, { id: '1', name: 'Salon', lastCommand: 'down', lastAt: 7, auto: { open: true, close: false } }])
    assert.deepEqual(calls, ['1 down'])
    fail.error = new Error('KO')
    assert.equal((await call(`${url}/shutters/1`, 'POST', { command: 'up' })).status, 502)
  })
  fail.error = null
  await withServer(routerApp(shuttersRouter(shutters)), async (url) => {
    assert.equal(((await call(`${url}/shutters/1`, 'POST', { command: 'stop' })).body as { auto: unknown }).auto, null)
  })
})

test('PUT /shutters/:id/auto : 400, 404, 503, ok', async () => {
  const { shutters, auto, calls } = setup()
  await withServer(routerApp(shuttersRouter(shutters, auto)), async (url) => {
    for (const body of [{}, { open: 'oui' }, { close: 1 }, { open: true, close: null }])
      assert.equal((await call(`${url}/shutters/1/auto`, 'PUT', body)).status, 400, JSON.stringify(body))
    assert.equal((await call(`${url}/shutters/1/auto`, 'PUT')).status, 400)
    assert.equal((await call(`${url}/shutters/2/auto`, 'PUT', { open: true })).status, 404)
    const ok = await call(`${url}/shutters/1/auto`, 'PUT', { close: false })
    assert.deepEqual([ok.status, ok.body], [200, { id: '1', auto: { open: true, close: false } }])
    assert.deepEqual(calls, ['auto 1 {"close":false}'])
  })
  await withServer(routerApp(shuttersRouter(shutters, null)), async (url) => {
    assert.equal((await call(`${url}/shutters/1/auto`, 'PUT', { open: true })).status, 503)
  })
})
