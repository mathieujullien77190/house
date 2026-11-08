import assert from 'node:assert/strict'
import { join } from 'node:path'
import { mock, test } from 'node:test'
import { createZonesStore, type ZonesStore } from '../lib/zonesStore.ts'
import { call, routerApp, withServer, withTempDir } from '../testing/helpers.ts'
import { zonesRouter } from './zones.ts'

const TRIANGLE = [
  [0, 0],
  [1, 0],
  [0, 1],
]

test('zones : lire, fixer, retirer', async () => {
  await withTempDir(async (dir) => {
    await withServer(routerApp(zonesRouter(createZonesStore(join(dir, 'zones.json')))), async (url) => {
      assert.deepEqual((await call(`${url}/zones`)).body, {})
      assert.deepEqual((await call(`${url}/zones/cam1`, 'PUT', { points: TRIANGLE })).body, { cam1: TRIANGLE })
      assert.deepEqual((await call(`${url}/zones`)).body, { cam1: TRIANGLE })
      assert.deepEqual((await call(`${url}/zones/cam1`, 'PUT', { points: null })).body, {})
    })
  })
})

test('zones : nom, polygone ou corps invalides donnent 400', async () => {
  await withTempDir(async (dir) => {
    await withServer(routerApp(zonesRouter(createZonesStore(join(dir, 'zones.json')))), async (url) => {
      assert.equal((await call(`${url}/zones/${'a'.repeat(41)}`, 'PUT', { points: null })).status, 400)
      const bad = [
        {},
        { points: [[0, 0]] },
        { points: 'non' },
        {
          points: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        },
      ]
      for (const body of bad) assert.equal((await call(`${url}/zones/cam1`, 'PUT', body)).status, 400)
      // sans corps du tout
      assert.equal((await call(`${url}/zones/cam1`, 'PUT')).status, 400)
    })
  })
})

test('zones : une erreur d’écriture donne 500', async () => {
  const log = mock.method(console, 'error', () => undefined)
  try {
    const zones = {
      get: () => ({}),
      set: () => {
        throw new Error('disque plein')
      },
    } as unknown as ZonesStore
    await withServer(routerApp(zonesRouter(zones)), async (url) => {
      assert.equal((await call(`${url}/zones/cam1`, 'PUT', { points: null })).status, 500)
    })
  } finally {
    log.mock.restore()
  }
})
