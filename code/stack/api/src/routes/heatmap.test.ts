import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { HeatmapService } from '../services/heatmapService.ts'
import { call, routerApp, withServer } from '../testing/helpers.ts'
import { heatmapRouter } from './heatmap.ts'

test('GET /heatmap : l’état de la caméra, 400 sans caméra valide', async () => {
  const seen: string[] = []
  const heatmap = { status: (camera: string) => (seen.push(camera), { pairs: 4 }) } as unknown as HeatmapService
  await withServer(routerApp(heatmapRouter(heatmap)), async (url) => {
    assert.deepEqual((await call(`${url}/heatmap?camera=cam-a`)).body, { pairs: 4 })
    assert.deepEqual(seen, ['cam-a'])
    assert.equal((await call(`${url}/heatmap`)).status, 400)
    assert.equal((await call(`${url}/heatmap?camera=a%20b`)).status, 400)
  })
})
