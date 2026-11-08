import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSnapshotsRepository } from '../repositories/snapshotsRepository.ts'
import { openFixture, withTempDir } from '../testing/helpers.ts'
import { createSnapshotsService, MAX_SNAPSHOT_TIMES, SNAPSHOT_TOLERANCE } from './snapshotsService.ts'

test('les instants couverts et l’image la plus proche (instant arrondi vers le bas)', async () => {
  await withTempDir((dir) => {
    const db = openFixture(dir)
    try {
      const service = createSnapshotsService(createSnapshotsRepository(db))
      assert.equal(MAX_SNAPSHOT_TIMES, 20000)
      assert.deepEqual(service.times('cam-a', 0, 5000), [1000, 1060])
      assert.deepEqual({ ...service.nearest('cam-a', 1059.9) }, { path: 'snaps/1060.jpg', taken_at: 1060 })
      assert.equal(service.nearest('cam-a', 1060 + SNAPSHOT_TOLERANCE + 1), null)
    } finally {
      db.close()
    }
  })
})
