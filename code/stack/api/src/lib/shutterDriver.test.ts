import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createEspSomfyDriver, createMockDriver, SHUTTER_COMMANDS } from './shutterDriver.ts'

test('les trois ordres', () => {
  assert.deepEqual(SHUTTER_COMMANDS, ['up', 'down', 'stop'])
})

test('la simulation garde les ordres sans rien envoyer', async () => {
  const driver = createMockDriver()
  assert.equal(driver.mock, true)
  await driver.send(2, 'down')
  await driver.send(2, 'stop')
  assert.deepEqual(driver.sent, [
    { shadeId: 2, command: 'down' },
    { shadeId: 2, command: 'stop' },
  ])
})

test('le pilote ESPSomfy : PUT /shadeCommand, stop part comme my', async () => {
  const calls: { url: string; init: RequestInit }[] = []
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response('{}', { status: 200 })
  }) as unknown as typeof fetch
  const driver = createEspSomfyDriver('http://esp///', fetcher)
  assert.equal(driver.mock, false)
  await driver.send(3, 'up')
  await driver.send(3, 'stop')
  assert.equal(calls[0].url, 'http://esp/shadeCommand')
  assert.equal(calls[0].init.method, 'PUT')
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { shadeId: 3, command: 'up' })
  assert.deepEqual(JSON.parse(calls[1].init.body as string), { shadeId: 3, command: 'my' })
})

test('le pilote ESPSomfy : une réponse HTTP non ok est une erreur', async () => {
  const fetcher = (async () => new Response('non', { status: 500 })) as unknown as typeof fetch
  await assert.rejects(createEspSomfyDriver('http://esp', fetcher).send(1, 'down'), /HTTP 500/)
})

test('le pilote ESPSomfy utilise fetch par défaut', async () => {
  await assert.rejects(createEspSomfyDriver('http://127.0.0.1:1').send(1, 'down'))
})
