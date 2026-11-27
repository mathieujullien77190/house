import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ReolinkCamera } from '../lib/reolinkClient.ts'
import { createZoomService, UnknownZoomCamera } from './zoomService.ts'

const setup = () => {
  const reads: string[] = []
  const sets: { host: string; pos: number }[] = []
  const service = createZoomService({
    cameras: [{ camera: 'pommier', host: '10.0.0.7', user: 'admin', password: 'x' }],
    client: {
      getZoom: async (camera: ReolinkCamera) => {
        reads.push(camera.host)
        return { pos: 4, min: 0, max: 28 }
      },
      setZoom: async (camera: ReolinkCamera, pos: number) => {
        sets.push({ host: camera.host, pos })
      },
    },
  })
  return { service, reads, sets }
}

test('get : la position et la plage de la caméra', async () => {
  const { service, reads } = setup()
  assert.deepEqual(await service.get('pommier'), { pos: 4, min: 0, max: 28, paused: false })
  assert.deepEqual(reads, ['10.0.0.7'])
})

test('set : la position est ramenée dans la plage, lue une seule fois', async () => {
  const { service, reads, sets } = setup()
  assert.deepEqual(await service.set('pommier', 12), { pos: 12, min: 0, max: 28, paused: false })
  assert.deepEqual(await service.set('pommier', 99), { pos: 28, min: 0, max: 28, paused: false })
  assert.deepEqual(await service.set('pommier', -3), { pos: 0, min: 0, max: 28, paused: false })
  assert.deepEqual(sets, [
    { host: '10.0.0.7', pos: 12 },
    { host: '10.0.0.7', pos: 28 },
    { host: '10.0.0.7', pos: 0 },
  ])
  assert.equal(reads.length, 1)
})

test('une caméra sans zoom : UnknownZoomCamera', async () => {
  const { service } = setup()
  await assert.rejects(service.get('voliere-toit'), UnknownZoomCamera)
  await assert.rejects(service.set('voliere-toit', 1), UnknownZoomCamera)
})

test('avec la pause : chaque lecture et chaque réglage réussi la tiennent à jour, et la réponse dit son état', async () => {
  const seen: string[] = []
  const state = { paused: false, fail: false }
  const service = createZoomService({
    cameras: [{ camera: 'pommier', host: '10.0.0.7', user: 'admin', password: 'x' }],
    client: {
      getZoom: async () => ({ pos: 4, min: 0, max: 28 }),
      setZoom: async () => {
        if (state.fail) throw new Error('muette')
      },
    },
    pause: {
      paused: () => state.paused,
      onSet: (camera, pos, min) => {
        seen.push(`set ${camera} ${pos} ${min}`)
        state.paused = true
      },
      observe: (camera, zoom) => void seen.push(`lu ${camera} ${zoom.pos}`),
    },
  })
  assert.deepEqual(await service.get('pommier'), { pos: 4, min: 0, max: 28, paused: false })
  assert.deepEqual(await service.set('pommier', 12), { pos: 12, min: 0, max: 28, paused: true })
  assert.deepEqual(seen, ['lu pommier 4', 'set pommier 12 0'])
  // Un réglage que la caméra refuse ne touche pas à la pause.
  state.fail = true
  await assert.rejects(service.set('pommier', 20))
  assert.equal(seen.length, 2)
})
