import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createPlanTable, importPlan, planRows } from './plan.ts'

const PLAN = {
  trees: [{ id: 't1', x: 10, y: 20, r: 30 }],
  hedges: [
    {
      id: 'haie-1',
      points: [
        [0, 0],
        [5, 5],
      ],
    },
  ],
  cage: { x: 1, y: 2 },
  offsets: { garage: { dx: 3, dy: 4 } },
  items: { prise: { x: 7, y: 8 } },
  cameras: [{ id: 'cage-haut-gauche', name: 'Caméra', x: 9, y: 10, angle: 180, fov: 50, near: 18, far: 190 }],
  links: { 'cage-haut-gauche': 'voliere-exterieur' },
}

test('une ligne par élément du plan, la caméra liée dans la ligne de la caméra du plan', () => {
  const rows = planRows(PLAN)
  assert.deepEqual(
    rows.map((row) => `${row.kind}:${row.id}`),
    ['arbre:t1', 'haie:haie-1', 'cage:cage', 'decalage:garage', 'objet:prise', 'camera:cage-haut-gauche'],
  )
  assert.equal(JSON.parse(rows[5]?.data ?? '{}').camera, 'voliere-exterieur')
  assert.deepEqual(planRows(null), [])
})

test('la table est refaite quand le plan change, pas sinon ; un plan illisible ne la touche pas', () => {
  const db = new DatabaseSync(':memory:')
  createPlanTable(db)
  assert.equal(importPlan(db, PLAN, 100), 6)
  assert.equal(importPlan(db, PLAN, 200), 0)
  assert.equal((db.prepare('SELECT updated_at FROM plan LIMIT 1').get() as { updated_at: number }).updated_at, 100)
  assert.equal(importPlan(db, { ...PLAN, trees: [] }, 300), 5)
  assert.equal(importPlan(db, null), 0)
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM plan').get() as { n: number }).n, 5)
})
