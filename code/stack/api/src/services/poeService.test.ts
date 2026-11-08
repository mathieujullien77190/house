import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PortStatus, SwitchClient } from '../lib/switchClient.ts'
import { listen } from '../testing/helpers.ts'
import { createPoeService, UnknownCamera } from './poeService.ts'

const status = (port: number, enabled: boolean): PortStatus => ({ port, enabled, powered: enabled, watts: enabled ? 5.5 : 0 })

/** Un faux switch : trois ports, on compte ses lectures et ses ordres. */
const fakeSwitch = () => {
  const calls = { ports: 0, setPoe: [] as [number, boolean][] }
  const client = {
    ports: async () => {
      calls.ports += 1
      return [status(1, false), status(2, true), status(3, true)]
    },
    setPoe: async (port: number, on: boolean) => {
      calls.setPoe.push([port, on])
      return status(port, on)
    },
  } as unknown as SwitchClient
  return { client, calls }
}

/** Un faux go2rtc dont on choisit la réponse à /api/streams. */
const fakeGo2rtc = async () => {
  const reply: { status: number; body: string } = { status: 200, body: '{}' }
  const server = await listen((_req, res) => {
    res.writeHead(reply.status, { 'Content-Type': 'application/json' })
    res.end(reply.body)
  })
  return { server, reply }
}

const streams = (bytes: number | null) =>
  JSON.stringify({ cam1_main: { producers: bytes === null ? [{}, {}] : [{ bytes_recv: bytes }, { bytes_recv: 1 }] } })

test('la liste suit les octets reçus par go2rtc, et se garde 3 secondes', async (t) => {
  const { server, reply } = await fakeGo2rtc()
  try {
    t.mock.timers.enable({ apis: ['Date'], now: 1_000_000 })
    const { client, calls } = fakeSwitch()
    const poe = createPoeService(client, { cam1: 2, cam2: 1 }, () => server.url)

    reply.body = streams(100)
    // première lecture : on suppose que oui s'il y a des octets
    assert.deepEqual(await poe.list(), [
      { camera: 'cam1', port: 2, on: true, powered: true, watts: 5.5, streaming: true },
      { camera: 'cam2', port: 1, on: false, powered: false, watts: 0, streaming: false },
    ])
    // dans les 3 secondes : le cache, sans interroger le switch
    t.mock.timers.tick(2999)
    await poe.list()
    assert.equal(calls.ports, 1)

    // les octets n'ont pas grandi : plus de flux
    t.mock.timers.tick(10_000)
    assert.equal((await poe.list())[0].streaming, false)
    // ils ont grandi
    reply.body = streams(500)
    t.mock.timers.tick(10_000)
    assert.equal((await poe.list())[0].streaming, true)
    // aucun octet compté (producteurs sans bytes_recv) : pas de flux
    reply.body = streams(null)
    t.mock.timers.tick(10_000)
    assert.equal((await poe.list())[0].streaming, false)
    // flux inconnu de go2rtc : pas de flux
    reply.body = '{}'
    t.mock.timers.tick(10_000)
    assert.equal((await poe.list())[0].streaming, false)
    // go2rtc répond une erreur : pas de flux
    reply.status = 500
    t.mock.timers.tick(10_000)
    assert.equal((await poe.list())[0].streaming, false)
    assert.equal(calls.ports, 6)
  } finally {
    await server.close()
  }
})

test('si go2rtc est injoignable, la caméra n’est pas en flux', async () => {
  const { client } = fakeSwitch()
  const poe = createPoeService(client, { cam1: 2 }, () => 'http://127.0.0.1:1')
  assert.equal((await poe.list())[0].streaming, false)
})

test('allumer ou couper une caméra connue commande son port et vide le cache', async () => {
  const { server, reply } = await fakeGo2rtc()
  try {
    reply.body = streams(10)
    const { client, calls } = fakeSwitch()
    const poe = createPoeService(client, { cam1: 3 }, () => server.url)
    await poe.list()
    // les octets n'ont pas grandi depuis la liste : pas de flux
    const power = await poe.set('cam1', false)
    assert.deepEqual(calls.setPoe, [[3, false]])
    assert.deepEqual(power, { camera: 'cam1', port: 3, on: false, powered: false, watts: 0, streaming: false })
    await poe.list()
    assert.equal(calls.ports, 2)
  } finally {
    await server.close()
  }
})

test('une caméra inconnue, même nommée comme une méthode d’objet, est refusée', async () => {
  const { client, calls } = fakeSwitch()
  const poe = createPoeService(client, { cam1: 3 }, () => 'http://127.0.0.1:1')
  await assert.rejects(() => poe.set('constructor', true), UnknownCamera)
  await assert.rejects(() => poe.set('absente', true), UnknownCamera)
  assert.deepEqual(calls.setPoe, [])
})
