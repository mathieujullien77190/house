// Le plan de la maison (la carte de la WebApp), écrit par House API dans un fichier JSON (data/house, monté en lecture seule) : arbres, haies, cage, chemin du garage et portes,
// lampe et prise, caméras du plan et leur lien avec les vraies caméras. House Sync l'importe dans la table `plan` de SQLite (onglet Base), une ligne par élément, pour qu'il soit
// gardé avec le reste des données et lisible à côté d'elles. Le fichier reste la source : la table est refaite quand il change.
import { readFile } from 'node:fs/promises'
import type { DatabaseSync } from 'node:sqlite'

export const PLAN_TABLE = 'plan'
const HASH_KEY = 'plan_hash'

export interface PlanRow {
  kind: string
  id: string
  x: number | null
  y: number | null
  /** Le reste de l'élément (rayon, sommets, angle, caméra liée…), en JSON. */
  data: string
}

export const createPlanTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${PLAN_TABLE} (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      x REAL,
      y REAL,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (kind, id)
    );
    CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
}

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
const number = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/** Les lignes de la table d'après le document du plan ; [] si le document n'a pas la forme attendue. */
export const planRows = (plan: unknown): PlanRow[] => {
  const raw = record(plan)
  const rows: PlanRow[] = []
  const links = record(raw.links)
  for (const item of Array.isArray(raw.trees) ? raw.trees : []) {
    const tree = record(item)
    rows.push({ kind: 'arbre', id: String(tree.id), x: number(tree.x), y: number(tree.y), data: JSON.stringify({ rayon: number(tree.r) }) })
  }
  for (const item of Array.isArray(raw.hedges) ? raw.hedges : []) {
    const hedge = record(item)
    rows.push({ kind: 'haie', id: String(hedge.id), x: null, y: null, data: JSON.stringify({ sommets: hedge.points }) })
  }
  const cage = record(raw.cage)
  if (number(cage.x) !== null) rows.push({ kind: 'cage', id: 'cage', x: number(cage.x), y: number(cage.y), data: '{}' })
  for (const [id, item] of Object.entries(record(raw.offsets))) {
    const offset = record(item)
    rows.push({ kind: 'decalage', id, x: number(offset.dx), y: number(offset.dy), data: '{}' })
  }
  for (const [id, item] of Object.entries(record(raw.items))) {
    const position = record(item)
    rows.push({ kind: 'objet', id, x: number(position.x), y: number(position.y), data: '{}' })
  }
  for (const item of Array.isArray(raw.cameras) ? raw.cameras : []) {
    const camera = record(item)
    const id = String(camera.id)
    rows.push({
      kind: 'camera',
      id,
      x: number(camera.x),
      y: number(camera.y),
      data: JSON.stringify({
        nom: camera.name,
        angle: camera.angle,
        champ: camera.fov,
        proche: camera.near,
        loin: camera.far,
        camera: typeof links[id] === 'string' ? links[id] : null,
      }),
    })
  }
  return rows
}

/** Lit le fichier du plan. null quand on ne peut pas en être sûr (absent, illisible, abîmé) : la table reste comme elle est. */
export const readPlan = async (file: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as unknown
  } catch {
    return null
  }
}

/** Refait la table d'après le plan si celui-ci a changé depuis la dernière fois ; rend le nombre de lignes écrites (0 si rien n'a changé). */
export const importPlan = (db: DatabaseSync, plan: unknown, now = Math.floor(Date.now() / 1000)): number => {
  if (plan === null || typeof plan !== 'object') return 0
  const rows = planRows(plan)
  const hash = JSON.stringify(rows)
  const known = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(HASH_KEY) as { value: string } | undefined
  if (known?.value === hash) return 0
  const insert = db.prepare(`INSERT INTO ${PLAN_TABLE} (kind, id, x, y, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
  db.exec('BEGIN')
  try {
    db.exec(`DELETE FROM ${PLAN_TABLE}`)
    for (const row of rows) insert.run(row.kind, row.id, row.x, row.y, row.data, now)
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
      HASH_KEY,
      hash,
    )
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return rows.length
}
