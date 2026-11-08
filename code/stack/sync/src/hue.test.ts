// Tests de la fiche publique du pont Hue (fetch simulé).
import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { parseBridgeConfig, readHueBridge } from './hue.ts'

afterEach(() => mock.restoreAll())

test('parseBridgeConfig : nom, modèle et versions ; null sans identifiant de pont', () => {
  assert.deepEqual(parseBridgeConfig({ bridgeid: 'ABC', name: 'Pont', modelid: 'BSB002', apiversion: '1.60', swversion: '1960' }), {
    name: 'Pont',
    model: 'BSB002',
    apiVersion: '1.60',
    softwareVersion: '1960',
  })
  assert.deepEqual(parseBridgeConfig({ bridgeid: 'ABC', name: '' }), { name: null, model: null, apiVersion: null, softwareVersion: null })
  assert.equal(parseBridgeConfig({ name: 'x' }), null)
  assert.equal(parseBridgeConfig('texte'), null)
  assert.equal(parseBridgeConfig(null), null)
})

test('readHueBridge : sans adresse ou adresse invalide, rien à montrer', async () => {
  assert.equal((await readHueBridge('')).configured, false)
  assert.equal((await readHueBridge('a b/c')).configured, false)
})

test('readHueBridge : joignable, réponse refusée, autre appareil, réseau coupé', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ bridgeid: 'ABC', name: 'Pont' }))
  const up = await readHueBridge('192.168.1.2')
  assert.equal(up.reachable, true)
  assert.equal(up.name, 'Pont')
  assert.equal(fetchMock.mock.calls[0]?.arguments[0], 'http://192.168.1.2/api/config')
  fetchMock.mock.mockImplementation(async () => new Response('', { status: 500 }))
  assert.equal((await readHueBridge('192.168.1.2')).reachable, false)
  fetchMock.mock.mockImplementation(async () => Response.json({ rien: 1 }))
  assert.equal((await readHueBridge('192.168.1.2')).reachable, false)
  fetchMock.mock.mockImplementation(async () => {
    throw new Error('hors ligne')
  })
  const down = await readHueBridge('192.168.1.2')
  assert.equal(down.reachable, false)
  assert.equal(down.configured, true)
})

test("readHueBridge : l'adresse vient de HUE_BRIDGE_IP par défaut", async () => {
  const before = process.env.HUE_BRIDGE_IP
  delete process.env.HUE_BRIDGE_IP
  try {
    assert.equal((await readHueBridge()).configured, false)
  } finally {
    if (before !== undefined) process.env.HUE_BRIDGE_IP = before
  }
})
