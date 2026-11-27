import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { test } from 'node:test'
import { loadConfig } from './config.ts'
import type { EventStore } from './events.ts'
import { startServer, type Detection, type Recording } from './server.ts'

/** Un enregistreur sur un port libre, avec une pause tenue en mémoire comme dans index.ts ; les autres réglages ne font rien. */
const withServer = async (work: (url: string, changes: string[]) => Promise<void>): Promise<void> => {
  const paused = new Set<string>()
  const changes: string[] = []
  const nothing = () => undefined
  const detection: Detection = {
    set: (camera, enabled) => void changes.push(`${camera} détection ${enabled}`),
    setSensitivity: nothing,
    setMinSeconds: nothing,
    setZone: nothing,
    setEyes: nothing,
    setFoliage: nothing,
    setRain: nothing,
    setLink: nothing,
    setPause: (camera, enabled) => {
      changes.push(`${camera} pause ${enabled}`)
      if (enabled) paused.add(camera)
      else paused.delete(camera)
    },
    paused: (camera) => paused.has(camera),
  }
  const recording: Recording = { status: () => ({ recording: false, id: null, started_at: null }), start: () => ({ id: 'x', started_at: 0 }), stop: () => null }
  const server = startServer(loadConfig({ CAMERAS: 'pommier,portail', PORT: '0' }), {} as EventStore, detection, recording, nothing)
  await once(server, 'listening')
  try {
    await work(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, changes)
  } finally {
    server.close()
  }
}

const call = async (url: string, method = 'GET'): Promise<{ status: number; body: unknown }> => {
  const response = await fetch(url, { method })
  return { status: response.status, body: await response.json() }
}

test('pause : PUT la pose et la lève, GET et /api/config la rendent', async () => {
  await withServer(async (url, changes) => {
    assert.deepEqual(await call(`${url}/api/cameras/pommier/pause`), { status: 200, body: { camera: 'pommier', paused: false } })
    assert.deepEqual(await call(`${url}/api/cameras/pommier/pause?enabled=1`, 'PUT'), { status: 200, body: { camera: 'pommier', paused: true } })
    assert.deepEqual(await call(`${url}/api/cameras/pommier/pause`), { status: 200, body: { camera: 'pommier', paused: true } })
    const config = (await call(`${url}/api/config`)).body as { cameras: Record<string, { paused: boolean }> }
    assert.equal(config.cameras.pommier.paused, true)
    assert.equal(config.cameras.portail.paused, false)
    assert.deepEqual(await call(`${url}/api/cameras/pommier/pause?enabled=0`, 'PUT'), { status: 200, body: { camera: 'pommier', paused: false } })
    assert.deepEqual(changes, ['pommier pause true', 'pommier pause false'])
  })
})

test('pause : la détection répétée par House Sync ne la lève pas', async () => {
  await withServer(async (url, changes) => {
    await call(`${url}/api/cameras/pommier/pause?enabled=1`, 'PUT')
    assert.equal((await call(`${url}/api/cameras/pommier/detection?enabled=1`, 'PUT')).status, 200)
    assert.deepEqual(await call(`${url}/api/cameras/pommier/pause`), { status: 200, body: { camera: 'pommier', paused: true } })
    assert.deepEqual(changes, ['pommier pause true', 'pommier détection true'])
  })
})

test('pause : caméra inconnue 404, valeur absente ou fausse 400, autre méthode 405', async () => {
  await withServer(async (url, changes) => {
    assert.equal((await call(`${url}/api/cameras/absente/pause?enabled=1`, 'PUT')).status, 404)
    assert.equal((await call(`${url}/api/cameras/absente/pause`)).status, 404)
    assert.equal((await call(`${url}/api/cameras/pommier/pause`, 'PUT')).status, 400)
    assert.equal((await call(`${url}/api/cameras/pommier/pause?enabled=oui`, 'PUT')).status, 400)
    assert.equal((await call(`${url}/api/cameras/pommier/pause?enabled=1`, 'POST')).status, 405)
    assert.deepEqual(changes, [])
  })
})
