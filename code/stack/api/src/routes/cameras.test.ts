import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CamerasService } from '../services/camerasService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { camerasRouter } from './cameras.ts'

test('cameras : le direct et les dernières images', async () => {
  const cameras = { liveStreams: () => [{ camera: 'a' }], lastImages: () => [{ camera: 'b' }] } as unknown as CamerasService
  await withServer(routerApp(camerasRouter(cameras)), async (url) => {
    assert.deepEqual((await call(`${url}/direct`)).body, [{ camera: 'a' }])
    assert.deepEqual((await call(`${url}/image`)).body, [{ camera: 'b' }])
  })
})
