import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FIXTURE_ROWS, openFixture, withTempDir } from '../testing/helpers.ts'
import { createCamerasRepository } from './camerasRepository.ts'
import { createEventsRepository } from './eventsRepository.ts'
import { createSnapshotsRepository } from './snapshotsRepository.ts'

/** Les lignes de SQLite n'ont pas de prototype : on les copie pour comparer. */
const plain = <T extends object>(rows: T[]): T[] => rows.map((row) => ({ ...row }))

test('les caméras : orientation réglée ou paysage, pluie en cours, dernières images triées', async () => {
  await withTempDir((dir) => {
    const db = openFixture(dir)
    try {
      const cameras = createCamerasRepository(db)
      assert.deepEqual(plain(cameras.liveStreams()), [
        { camera: 'cam-a', url: 'http://go2rtc:1984/stream.html?src=cam-a_sub', orientation: 'portrait', rain: 'heavy', eyes: true },
        { camera: 'cam-b', url: 'pas une adresse', orientation: 'landscape', rain: 'off', eyes: false },
      ])
      assert.deepEqual(plain(cameras.lastImages()).length, 2)
      assert.deepEqual(plain(cameras.lastImages()), [
        { camera: 'cam-a', url: 'http://x/a.jpg' },
        { camera: 'cam-b', url: 'http://x/b.jpg' },
      ])
    } finally {
      db.close()
    }
  })
})

test('les caméras : rangées dans l’ordre d’arrivée, les inconnues après par ordre alphabétique', async () => {
  await withTempDir((dir) => {
    const rows = `INSERT INTO live_streams VALUES ('zebre', 'z'), ('voliere-toit', 't'), ('abeille', 'a'), ('voliere-exterieur', 'e'), ('voliere-interieur', 'i'), ('salon-de-jardin', 's');
      INSERT INTO last_images VALUES ('zebre', 'z'), ('voliere-toit', 't'), ('abeille', 'a'), ('voliere-exterieur', 'e'), ('voliere-interieur', 'i'), ('salon-de-jardin', 's');
      INSERT INTO events VALUES ('x1', 'zebre', 'mouvement', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL), ('x2', 'voliere-toit', 'mouvement', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL), ('x3', 'abeille', 'mouvement', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL), ('x4', 'voliere-interieur', 'mouvement', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL);`
    const db = openFixture(dir, rows)
    try {
      const order = ['voliere-interieur', 'voliere-exterieur', 'salon-de-jardin', 'voliere-toit', 'abeille', 'zebre']
      const cameras = createCamerasRepository(db)
      assert.deepEqual(cameras.liveStreams().map((row) => row.camera), order)
      assert.deepEqual(cameras.lastImages().map((row) => row.camera), order)
      assert.deepEqual(createEventsRepository(db).lastPerCamera().map((row) => row.camera), ['voliere-interieur', 'voliere-toit', 'abeille', 'zebre'])
    } finally {
      db.close()
    }
  })
})

test('les caméras : une pluie faible, et une caméra sans réglage (paysage, pas de pluie)', async () => {
  await withTempDir((dir) => {
    const rows = `${FIXTURE_ROWS} INSERT INTO live_streams VALUES ('cam-c', 'x'), ('cam-d', 'y'); INSERT INTO settings VALUES ('cam-c', 'landscape', 'rain', NULL);`
    const db = openFixture(dir, rows)
    try {
      assert.deepEqual(plain(createCamerasRepository(db).liveStreams()).slice(2), [
        { camera: 'cam-c', url: 'x', orientation: 'landscape', rain: 'rain', eyes: false },
        { camera: 'cam-d', url: 'y', orientation: 'landscape', rain: 'off', eyes: false },
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
      assert.equal(events.clipShapesPath('e1'), 'clips/e1.shapes.json')
      assert.equal(events.clipShapesPath('e3'), null)
      assert.equal(events.clipShapesPath('absent'), null)
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
      assert.deepEqual({ ...snapshots.nearest('cam-a', 1050, 300) }, { path: 'snaps/1060.jpg', taken_at: 1060, code: 'ab' })
      assert.equal(snapshots.nearest('cam-a', 5000, 300), null)
    } finally {
      db.close()
    }
  })
})
