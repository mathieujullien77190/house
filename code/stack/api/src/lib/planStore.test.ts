import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createPlanStore, parsePlan } from './planStore.ts'

test('un document vide est valable, le reste est nettoyé et arrondi', () => {
  assert.deepEqual(parsePlan(null), { trees: [], hedges: [], cage: null, offsets: {}, items: {}, cameras: [], links: {} })
  const plan = parsePlan({
    trees: [
      { id: 't1', x: 1.234, y: 2, r: 10 },
      { id: 'bad id', x: 1, y: 1, r: 1 },
      { id: 't2', x: 'a', y: 1, r: 1 },
    ],
    hedges: [
      {
        id: 'h1',
        points: [
          [0, 0],
          [1.126, 2],
        ],
      },
      { id: 'h2', points: [[0, 0]] },
    ],
    cage: { x: 5, y: 6 },
    offsets: { garage: { dx: 1, dy: 2 } },
    links: { 'cage-haut-gauche': 'voliere-exterieur', mauvais: 'pas valable!' },
    inconnu: true,
  })
  assert.deepEqual(plan.trees, [{ id: 't1', x: 1.23, y: 2, r: 10 }])
  assert.deepEqual(plan.hedges, [
    {
      id: 'h1',
      points: [
        [0, 0],
        [1.13, 2],
      ],
    },
  ])
  assert.deepEqual(plan.cage, { x: 5, y: 6 })
  assert.deepEqual(plan.offsets, { garage: { dx: 1, dy: 2 } })
  assert.deepEqual(plan.links, { 'cage-haut-gauche': 'voliere-exterieur' })
})

test('le plan se garde dans un fichier et se relit ; sans fichier, null', () => {
  const folder = mkdtempSync(join(tmpdir(), 'plan-'))
  try {
    const file = join(folder, 'sous', 'plan.json')
    const store = createPlanStore(file)
    assert.equal(store.get(), null)
    store.set({ cage: { x: 1, y: 2 } })
    assert.deepEqual(store.get()?.cage, { x: 1, y: 2 })
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).cage.y, 2)
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
})
