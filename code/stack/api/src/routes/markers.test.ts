import assert from 'node:assert/strict'
import { join } from 'node:path'
import { mock, test } from 'node:test'
import { createMarkersStore, type MarkersStore } from '../lib/markersStore.ts'
import { call, routerApp, withServer, withTempDir } from '../testing/helpers.ts'
import { markersRouter } from './markers.ts'

const LIST = [{ target: 'cam2', x: 0.3, y: 0.5 }]

test('repères : lire, fixer, retirer', async () => {
  await withTempDir(async (dir) => {
    await withServer(routerApp(markersRouter(createMarkersStore(join(dir, 'markers.json')))), async (url) => {
      assert.deepEqual((await call(`${url}/markers`)).body, {})
      assert.deepEqual((await call(`${url}/markers/cam1`, 'PUT', { markers: LIST })).body, { cam1: LIST })
      assert.deepEqual((await call(`${url}/markers`)).body, { cam1: LIST })
      assert.deepEqual((await call(`${url}/markers/cam1`, 'PUT', { markers: [] })).body, { cam1: [] })
      assert.deepEqual((await call(`${url}/markers/cam1`, 'PUT', { markers: null })).body, {})
    })
  })
})

test('repères : nom, repères ou corps invalides donnent 400', async () => {
  await withTempDir(async (dir) => {
    await withServer(routerApp(markersRouter(createMarkersStore(join(dir, 'markers.json')))), async (url) => {
      assert.equal((await call(`${url}/markers/${'a'.repeat(41)}`, 'PUT', { markers: null })).status, 400)
      const bad = [{}, { markers: 'non' }, { markers: [{ target: 'cam2', x: 3, y: 0 }] }, { markers: [{ target: 'cam2' }] }]
      for (const body of bad) assert.equal((await call(`${url}/markers/cam1`, 'PUT', body)).status, 400)
      // sans corps du tout
      assert.equal((await call(`${url}/markers/cam1`, 'PUT')).status, 400)
    })
  })
})

test('repères : une erreur d’écriture donne 500', async () => {
  const log = mock.method(console, 'error', () => undefined)
  try {
    const markers = {
      get: () => ({}),
      set: () => {
        throw new Error('disque plein')
      },
    } as unknown as MarkersStore
    await withServer(routerApp(markersRouter(markers)), async (url) => {
      assert.equal((await call(`${url}/markers/cam1`, 'PUT', { markers: null })).status, 500)
    })
  } finally {
    log.mock.restore()
  }
})
