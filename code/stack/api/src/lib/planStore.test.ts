import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createPlanStore, parsePlan } from './planStore.ts'

test('un document vide est valable, le reste est nettoyé et arrondi', () => {
  assert.deepEqual(parsePlan(null), { version: 1, trees: [], hedges: [], cage: null, offsets: {}, items: {}, cameras: [], links: {} })
  const plan = parsePlan({
    trees: [
      { id: 't1', x: 2.6501234567891, y: 48.5220754, r: 10 },
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
    version: 2,
    inconnu: true,
  })
  assert.deepEqual(plan.trees, [{ id: 't1', x: 2.6501235, y: 48.5220754, r: 10 }])
  assert.deepEqual(plan.hedges, [
    {
      id: 'h1',
      points: [
        [0, 0],
        [1.126, 2],
      ],
    },
  ])
  assert.equal(plan.version, 2)
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

test('les positions de la lampe et de la prise, les caméras du plan, les liens : seul ce qui est bien formé reste', () => {
  const camera = { id: 'c1', name: 'Voliere', x: 1.00000004, y: 2, angle: 90, fov: 60, near: 1, far: 10 }
  const plan = parsePlan({
    trees: [
      { id: '', x: 1, y: 1, r: 1 },
      { id: 't', x: 1, y: 1, r: 0 },
      { id: 't', x: 1, y: 1, r: 1 },
    ],
    hedges: [
      { id: 'h', points: [[0, 0], [1, 1], 'x'] },
      { id: 'h', points: 'pas un tableau' },
      {
        id: 'mauvais id',
        points: [
          [0, 0],
          [1, 1],
        ],
      },
      { id: 'h', points: Array.from({ length: 401 }, () => [0, 0]) },
      {
        id: 'h',
        points: [
          [0, 0],
          [1, 1, 1],
        ],
      },
    ],
    cage: { x: 1 },
    offsets: { 'bad id': { dx: 1, dy: 1 }, ok: { dx: 'a', dy: 1 }, ok2: { dx: 1, dy: 2 } },
    items: { 'bad id': { x: 1, y: 1 }, lampe: { x: 'a', y: 1 }, prise: { x: 1.5, y: 2.5 } },
    cameras: [
      camera,
      { ...camera, id: 'mauvais id' },
      { ...camera, name: '' },
      { ...camera, x: 'a' },
      { ...camera, y: 'a' },
      { ...camera, angle: 'a' },
      { ...camera, fov: 'a' },
      { ...camera, near: 'a' },
      { ...camera, far: 'a' },
      'pas une caméra',
    ],
    links: { 'bad id': 'cam', c1: 'voliere-exterieur', c2: 5 },
  })
  assert.deepEqual(plan.trees, [{ id: 't', x: 1, y: 1, r: 1 }])
  assert.deepEqual(plan.hedges, [])
  assert.equal(plan.cage, null)
  assert.deepEqual(plan.offsets, { ok2: { dx: 1, dy: 2 } })
  assert.deepEqual(plan.items, { prise: { x: 1.5, y: 2.5 } })
  assert.deepEqual(plan.cameras, [{ ...camera, x: 1 }])
  assert.deepEqual(plan.links, { c1: 'voliere-exterieur' })
})

test('un identifiant ou un nom trop long est jeté, un tableau n’est pas un objet', () => {
  assert.deepEqual(parsePlan([]).trees, [])
  assert.deepEqual(parsePlan({ trees: [{ id: 'a'.repeat(61), x: 1, y: 1, r: 1 }] }).trees, [])
  assert.deepEqual(parsePlan({ trees: 'non' }).trees, [])
  assert.equal(
    parsePlan({ cameras: [{ id: 'c', name: 'n'.repeat(201), x: 1, y: 1, angle: 1, fov: 1, near: 1, far: 1 }] }).cameras.length,
    0,
  )
})
