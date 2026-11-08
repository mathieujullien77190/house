import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openFixture, withTempDir } from '../testing/helpers.ts'
import { createCamerasRepository } from './camerasRepository.ts'
import { createEventsRepository } from './eventsRepository.ts'
import { createSnapshotsRepository } from './snapshotsRepository.ts'

/** Les lignes de SQLite n'ont pas de prototype : on les copie pour comparer. */
const plain = <T extends object>(rows: T[]): T[] => rows.map((row) => ({ ...row }))

test('les caméras : orientation réglée ou paysage, dernières images triées', async () => {
  await withTempDir((dir) => {
    const db = openFixture(dir)
    try {
      const cameras = createCamerasRepository(db)
      assert.deepEqual(plain(cameras.liveStreams()), [
        { camera: 'cam-a', url: 'http://go2rtc:1984/stream.html?src=cam-a_sub', orientation: 'portrait' },
        { camera: 'cam-b', url: 'pas une adresse', orientation: 'landscape' },
      ])
      assert.deepEqual(plain(cameras.lastImages()), [
        { camera: 'cam-a', url: 'http://x/a.jpg' },
        { camera: 'cam-b', url: 'http://x/b.jpg' },
      ])
    } finally {
      db.close()
    }
  })
})

test('les événements : derniers, fenêtre, identifiants, derniers par caméra, chemins', async () => {
  await withTempDir((dir) => {
    const db = openFixture(dir)
    try {
      const events = createEventsRepository(db)
      const ids = (rows: { id: string }[]) => rows.map((row) => row.id)
      assert.deepEqual(ids(events.latest(2)), ['e2', 'e3'])
      assert.deepEqual(ids(events.between({}, 10)), ['e2', 'e3', 'e1'])
      assert.deepEqual(ids(events.between({ camera: 'cam-a' }, 10)), ['e2', 'e1'])
      assert.deepEqual(ids(events.between({ from: 250 }, 10)), ['e2'])
      // un événement en cours touche toute fenêtre qui finit après son début
      assert.deepEqual(ids(events.between({ from: 5000 }, 10)), ['e2'])
      assert.deepEqual(ids(events.between({ to: 120 }, 10)), ['e1'])
      assert.deepEqual(ids(events.between({ camera: 'cam-a', from: 150, to: 400 }, 1)), ['e2'])
      assert.deepEqual(ids(events.byIds([])), [])
      assert.deepEqual(ids(events.byIds(['e1', 'e3', 'absent'])), ['e3', 'e1'])
      assert.deepEqual(ids(events.lastPerCamera()), ['e2', 'e3'])
      assert.equal(events.clipPath('e1'), 'clips/e1.mp4')
      assert.equal(events.clipPath('e1', true), 'clips/e1.h264.mp4')
      assert.equal(events.clipPath('e2'), null)
      assert.equal(events.clipPath('absent', true), null)
      assert.equal(events.clipAudioPath('e1'), 'clips/e1.aac')
      assert.equal(events.clipAudioPath('e3'), null)
      assert.equal(events.clipAudioPath('absent'), null)
    } finally {
      db.close()
    }
  })
})

test('les images : instants couverts et la plus proche dans la tolérance', async () => {
  await withTempDir((dir) => {
    const db = openFixture(dir)
    try {
      const snapshots = createSnapshotsRepository(db)
      assert.deepEqual(snapshots.times('cam-a', 0, 2000, 10), [1000, 1060])
      assert.deepEqual(snapshots.times('cam-a', 0, 2000, 1), [1000])
      assert.deepEqual(snapshots.times('cam-a', 1001, 2000, 10), [1060])
      assert.deepEqual({ ...snapshots.nearest('cam-a', 1050, 300) }, { path: 'snaps/1060.jpg', taken_at: 1060 })
      assert.equal(snapshots.nearest('cam-a', 5000, 300), null)
    } finally {
      db.close()
    }
  })
})
