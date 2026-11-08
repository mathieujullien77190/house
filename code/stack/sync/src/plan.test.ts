import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPlanTable, importPlan, planRows, readPlan } from './plan.ts'

const PLAN = {
  version: 2,
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
  // Un plan encore en unités du dessin (version 1) n'est pas importé.
  assert.deepEqual(planRows({ ...PLAN, version: 1 }), [])
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

test('un plan aux formes bizarres : rien ne casse, les valeurs absentes deviennent null', () => {
  const rows = planRows({ version: 2, trees: [{ id: 't', x: 'a' }], cage: { x: 'a' }, cameras: [{ id: 'c' }], links: [], offsets: { o: 3 }, items: { i: [] } })
  assert.deepEqual(
    rows.map((row) => `${row.kind}:${row.id}:${row.longitude}`),
    ['arbre:t:null', 'decalage:o:null', 'objet:i:null', 'camera:c:null'],
  )
  assert.equal(JSON.parse(rows[3]?.data ?? '{}').camera, null)
  assert.deepEqual(planRows({ version: 2 }), [])
  assert.deepEqual(planRows([]), [])
  assert.deepEqual(planRows({ version: 2, cage: 'x', trees: 'x', hedges: 'x', cameras: 'x', links: 'x' }), [])
})

test('readPlan : le JSON du fichier, ou null s\'il manque ou est abîmé', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sync-plan-'))
  try {
    writeFileSync(`${dir}/plan.json`, JSON.stringify(PLAN))
    assert.deepEqual(await readPlan(`${dir}/plan.json`), PLAN)
    assert.equal(await readPlan(`${dir}/absent.json`), null)
    writeFileSync(`${dir}/plan.json`, '{')
    assert.equal(await readPlan(`${dir}/plan.json`), null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('importPlan : un plan sans élément vide la table ; un autre document ne la touche pas', () => {
  const db = new DatabaseSync(':memory:')
  createPlanTable(db)
  assert.equal(importPlan(db, PLAN, 1), 6)
  assert.equal(importPlan(db, { version: 2 }, 2), 0)
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM plan').get() as { n: number }).n, 0)
  assert.equal(importPlan(db, { version: 1, trees: [] }, 3), 0)
  assert.equal(importPlan(db, 'texte', 4), 0)
  assert.equal(importPlan(db, PLAN), 6)
})

test('importPlan : un échec en route annule tout et se répète', () => {
  const db = new DatabaseSync(':memory:')
  createPlanTable(db)
  importPlan(db, PLAN, 1)
  const doubled = { ...PLAN, trees: [{ id: 'même', x: 1, y: 2, r: 3 }, { id: 'même', x: 1, y: 2, r: 3 }] }
  assert.throws(() => importPlan(db, doubled, 2), /UNIQUE/)
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM plan').get() as { n: number }).n, 6)
})

test('createPlanTable jette une table d\'avant (colonnes x et y) et oublie son empreinte', () => {
  const db = new DatabaseSync(':memory:')
  db.exec("CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); INSERT INTO app_settings VALUES ('plan_hash', 'vieux')")
  db.exec('CREATE TABLE plan (kind TEXT, id TEXT, x REAL, y REAL, data TEXT, updated_at INTEGER)')
  createPlanTable(db)
  const columns = (db.prepare('PRAGMA table_info(plan)').all() as { name: string }[]).map((column) => column.name)
  assert.ok(columns.includes('longitude') && !columns.includes('x'))
  assert.equal(db.prepare("SELECT 1 FROM app_settings WHERE key = 'plan_hash'").get(), undefined)
})
