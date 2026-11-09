import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import jpeg from 'jpeg-js'
import { COLS, ROWS } from '../lib/heatmapMath.ts'
import { createHeatmapStore, emptyHeatmap, type Heatmap, type HeatmapStore } from '../lib/heatmapStore.ts'
import type { SnapshotsRepository } from '../repositories/snapshotsRepository.ts'
import { withTempDir } from '../testing/helpers.ts'
import { createHeatmapService, SAVE_EVERY, type HeatmapService } from './heatmapService.ts'

type Row = { path: string; taken_at: number }

const repository = (rows: Row[]): SnapshotsRepository =>
  ({ after: (_camera: string, after: number, limit: number) => rows.filter((row) => row.taken_at > after).slice(0, limit) }) as unknown as SnapshotsRepository

/** Un faux décodeur : la première octet du fichier est le gris du premier pixel, le deuxième vaut 1 pour une image en damier (tout change). */
const decode = (file: Uint8Array) => {
  const data = new Uint8Array(COLS * ROWS * 4)
  for (let i = 0; i < COLS * ROWS; i++) {
    const gray = file[1] === 1 ? (i % 2 === 0 ? 0 : 200) : i === 0 ? file[0]! : 100
    data.set([gray, gray, gray, 255], i * 4)
  }
  if (file[0] === 0 && file[1] === 9) throw new Error('image abîmée')
  return { data, width: COLS, height: ROWS }
}

const finish = async (service: HeatmapService, camera: string) => {
  let status = service.status(camera)
  while (status.computing) {
    await new Promise<void>((done) => setImmediate(done))
    status = service.status(camera)
  }
  return status
}

const setup = async (work: (dir: string, store: HeatmapStore) => Promise<void>): Promise<void> => {
  await withTempDir(async (dir) => {
    mkdirSync(join(dir, 'snaps'))
    await work(dir, createHeatmapStore(join(dir, 'state')))
  })
}

const put = (dir: string, name: string, bytes: number[]): string => {
  writeFileSync(join(dir, 'snaps', name), Uint8Array.from(bytes))
  return `snaps/${name}`
}

test('les paires proches sont comparées, les trop éloignées, abîmées, hors du disque ou globales non', async () => {
  await setup(async (dir, store) => {
    const rows: Row[] = [
      { path: put(dir, 'a', [100, 0]), taken_at: 1000 },
      { path: put(dir, 'b', [160, 0]), taken_at: 1060 },
      // abîmée : sautée, la suivante est comparée à la dernière image lue
      { path: put(dir, 'bad', [0, 9]), taken_at: 1120 },
      { path: 'snaps/absente', taken_at: 1180 },
      { path: '../dehors.jpg', taken_at: 1240 },
      { path: put(dir, 'c', [100, 0]), taken_at: 1300 },
      // plus de 330 s après la précédente : pas de paire
      { path: put(dir, 'd', [160, 0]), taken_at: 2000 },
      // damier : toute l'image change, la paire est ignorée
      { path: put(dir, 'e', [0, 1]), taken_at: 2060 },
    ]
    const service = createHeatmapService({ snapshots: repository(rows), store, dataDir: dir, decode, yieldNow: async () => undefined })
    const first = service.status('cam')
    assert.equal(first.computing, true)
    assert.equal(first.total, rows.length)
    // une seconde demande pendant le calcul ne le relance pas
    assert.equal(service.status('cam').computing, true)
    const status = await finish(service, 'cam')
    assert.deepEqual([status.cols, status.rows, status.pairs, status.done, status.total], [COLS, ROWS, 2, 0, 0])
    assert.equal(status.levels.length, status.thresholds.length)
    const bytes = Buffer.from(status.levels[0]!, 'base64')
    assert.equal(bytes.length, COLS * ROWS * 2)
    // la case 0 a dépassé le premier seuil dans les deux paires (a-b, b-c)
    assert.equal(bytes.readUInt16LE(0), 2)
    const saved = store.read('cam')
    assert.equal(saved.upTo, 2060)
    assert.equal(saved.pairs, 2)
  })
})

test('le calcul reprend après la dernière image, depuis la carte gardée', async () => {
  await setup(async (dir, store) => {
    const heat = emptyHeatmap()
    heat.upTo = 1000
    heat.frameAt = 1000
    heat.frame = new Uint8Array(COLS * ROWS).fill(100)
    store.write('cam', heat)
    const rows: Row[] = [
      { path: put(dir, 'a', [100, 0]), taken_at: 1000 },
      { path: put(dir, 'b', [160, 0]), taken_at: 1060 },
    ]
    const service = createHeatmapService({ snapshots: repository(rows), store, dataDir: dir, decode, yieldNow: async () => undefined })
    const status = await finish(service, 'cam')
    assert.equal(status.pairs, 1)
    // une nouvelle image arrive : seule elle est lue
    rows.push({ path: put(dir, 'c', [100, 0]), taken_at: 1120 })
    assert.equal((await finish(service, 'cam')).pairs, 2)
  })
})

test('la carte est gardée toutes les SAVE_EVERY images', async () => {
  await setup(async (dir, store) => {
    const path = put(dir, 'a', [100, 0])
    const rows: Row[] = Array.from({ length: SAVE_EVERY * 2 + 5 }, (_, i) => ({ path, taken_at: 1000 + i * 60 }))
    const writes: number[] = []
    const counting = { read: store.read, write: (camera: string, heat: Heatmap) => (writes.push(heat.upTo), store.write(camera, heat)) } as HeatmapStore
    const service = createHeatmapService({ snapshots: repository(rows), store: counting, dataDir: dir, decode, yieldNow: async () => undefined })
    await finish(service, 'cam')
    assert.deepEqual(writes, [1000 + (SAVE_EVERY - 1) * 60, 1000 + (SAVE_EVERY * 2 - 1) * 60, 1000 + (SAVE_EVERY * 2 + 4) * 60, 1000 + (SAVE_EVERY * 2 + 4) * 60])
  })
})

test('une erreur du dépôt n’arrête pas l’API : le calcul n’a simplement pas lieu', async () => {
  await setup(async (dir, store) => {
    const snapshots = {
      after: () => {
        throw new Error('base fermée')
      },
    } as unknown as SnapshotsRepository
    const service = createHeatmapService({ snapshots, store, dataDir: dir })
    assert.equal(service.status('cam').computing, false)
    assert.equal(service.status('cam').pairs, 0)
  })
})

test('avec le vrai décodeur JPEG et la vraie pause', async () => {
  await setup(async (dir, store) => {
    const image = (gray: number): number[] => {
      const data = Buffer.alloc(16 * 9 * 4, gray)
      return [...jpeg.encode({ data, width: 16, height: 9 }, 90).data]
    }
    const rows: Row[] = [
      { path: put(dir, 'a.jpg', image(50)), taken_at: 1000 },
      { path: put(dir, 'b.jpg', image(50)), taken_at: 1060 },
    ]
    const service = createHeatmapService({ snapshots: repository(rows), store, dataDir: dir })
    assert.equal((await finish(service, 'cam')).pairs, 1)
  })
})
