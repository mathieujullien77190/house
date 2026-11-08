import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCamerasService } from './camerasService.ts'

test('le service rend ce que le dépôt lui donne', () => {
  const streams = [{ camera: 'a', url: 'u', orientation: 'portrait' as const }]
  const images = [{ camera: 'a', url: 'i' }]
  const service = createCamerasService({ liveStreams: () => streams, lastImages: () => images })
  assert.equal(service.liveStreams(), streams)
  assert.equal(service.lastImages(), images)
})
