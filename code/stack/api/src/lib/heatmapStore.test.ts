import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { withTempDir } from '../testing/helpers.ts'
import { COLS, ROWS } from './heatmapMath.ts'
import { createHeatmapStore, emptyHeatmap } from './heatmapStore.ts'

const CELLS = COLS * ROWS

test('une carte absente est vide', async () => {
  await withTempDir((dir) => {
    const heat = createHeatmapStore(dir).read('cam')
    assert.deepEqual([heat.upTo, heat.frameAt, heat.frame, heat.pairs], [0, 0, null, 0])
    assert.equal(heat.counts.length, 8)
  })
})

test('écrire puis relire rend la même carte', async () => {
  await withTempDir((dir) => {
    const store = createHeatmapStore(join(dir, 'sous'))
    const heat = emptyHeatmap()
    heat.upTo = 50
    heat.frameAt = 49
    heat.frame = new Uint8Array(CELLS).fill(7)
    heat.pairs = 3
    heat.counts[2]![10] = 300
    store.write('cam', heat)
    const back = store.read('cam')
    assert.deepEqual([back.upTo, back.frameAt, back.pairs], [50, 49, 3])
    assert.deepEqual([...back.frame!], [...heat.frame])
    assert.equal(back.counts[2]![10], 300)
    // sans image précédente
    store.write('cam', emptyHeatmap())
    assert.equal(store.read('cam').frame, null)
  })
})

test('un fichier abîmé, d’une autre version ou de mauvaise forme donne une carte vide', async () => {
  await withTempDir((dir) => {
    const store = createHeatmapStore(dir)
    const heat = emptyHeatmap()
    heat.upTo = 5
    heat.pairs = 2
    store.write('cam', heat)
    const file = join(dir, 'heatmap-cam.json')
    const valid = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    const cases: unknown[] = [
      'pas du json',
      { ...valid, version: 99 },
      { ...valid, upTo: 'x' },
      { ...valid, frameAt: 'x' },
      { ...valid, pairs: 'x' },
      { ...valid, counts: 'x' },
      { ...valid, counts: [] },
      { ...valid, counts: (valid.counts as string[]).map(() => 'AAAA') },
      { ...valid, counts: (valid.counts as unknown[]).map(() => 3) },
    ]
    for (const bad of cases) {
      writeFileSync(file, typeof bad === 'string' ? bad : JSON.stringify(bad))
      assert.equal(store.read('cam').pairs, 0)
      assert.equal(store.read('cam').upTo, 0)
    }
    // une image précédente de mauvaise taille est oubliée, la carte reste
    writeFileSync(file, JSON.stringify({ ...valid, frame: 'AAAA' }))
    const kept = store.read('cam')
    assert.equal(kept.upTo, 5)
    assert.equal(kept.frame, null)
  })
})
