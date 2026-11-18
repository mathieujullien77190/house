import assert from 'node:assert/strict'
import { test } from 'node:test'
import { call, memoryDoc, routerApp, withServer } from '../testing/helpers.ts'
import { guestLanRouter } from './guestLan.ts'

test('le lien de la page du réseau : adresse avec la clé et état des interrupteurs', async () => {
  const doc = memoryDoc(JSON.stringify({ enabled: true, cameras: true, lights: true }))
  await withServer(routerApp(guestLanRouter('une-cle/assez longue', doc, 'chezmatou.local', 8080)), async (url) => {
    const reply = await call(`${url}/guest-lan/link`)
    assert.equal(reply.status, 200)
    assert.equal(reply.headers.get('cache-control'), 'no-store')
    assert.deepEqual(reply.body, {
      configured: true,
      url: 'https://chezmatou.local:8080/chezmatou?k=une-cle%2Fassez%20longue',
      enabled: true,
      cameras: true,
      shutters: false,
      lights: true,
      ac: false,
    })
  })
})

test('sans clé assez longue : pas d’adresse', async () => {
  await withServer(routerApp(guestLanRouter('courte', memoryDoc(), 'chezmatou.local', 8080)), async (url) => {
    assert.deepEqual((await call(`${url}/guest-lan/link`)).body, { configured: false, url: null, enabled: false, cameras: false, shutters: false, lights: false, ac: false })
  })
})
