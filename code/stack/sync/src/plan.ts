// Le plan de la maison (la carte de la WebApp), écrit par House API dans un fichier JSON (data/house, monté en lecture seule) : arbres, haies, cage, chemin du garage et portes,
// lampe et prise, caméras du plan et leur lien avec les vraies caméras. House Sync l'importe dans la table `plan` de SQLite (onglet Base), une ligne par élément, pour qu'il soit
// gardé avec le reste des données et lisible à côté d'elles. Le fichier reste la source : la table est refaite quand il change.
// Les valeurs sont de vraies mesures : `longitude` et `latitude` (degrés), les tailles en mètres, les angles en degrés (cap depuis le nord, sens horaire).
import { readFile } from 'node:fs/promises'
import type { DatabaseSync } from 'node:sqlite'

export const PLAN_TABLE = 'plan'
const HASH_KEY = 'plan_hash'
/** Version du document où les positions sont des longitudes et latitudes (voir api/src/lib/planStore.ts). Un plan plus ancien, en unités du dessin, n'est pas importé. */
const REAL_COORDINATES = 2

export interface PlanRow {
  kind: string
  id: string
  longitude: number | null
  latitude: number | null
  /** Le reste de l'élément (rayon en mètres, angle en degrés, sommets, caméra liée…), en JSON. */
  data: string
}

export const createPlanTable = (db: DatabaseSync): void => {
  // Une table d'une version précédente (colonnes x et y, en unités du dessin) est jetée : elle se refait depuis le fichier.
  const columns = db.prepare(`PRAGMA table_info(${PLAN_TABLE})`).all() as { name: string }[]
  if (columns.some((column) => column.name === 'x')) {
    db.exec(`DROP TABLE ${PLAN_TABLE}`)
    db.exec("DELETE FROM app_settings WHERE key = 'plan_hash'")
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${PLAN_TABLE} (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      longitude REAL,
      latitude REAL,
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

/** Les lignes de la table d'après le document du plan ; [] si le document n'a pas la forme attendue ou n'est pas en vraies coordonnées. */
export const planRows = (plan: unknown): PlanRow[] => {
  const raw = record(plan)
  if (raw.version !== REAL_COORDINATES) return []
  const rows: PlanRow[] = []
  const links = record(raw.links)
  for (const item of Array.isArray(raw.trees) ? raw.trees : []) {
    const tree = record(item)
    rows.push({
      kind: 'arbre',
      id: String(tree.id),
      longitude: number(tree.x),
      latitude: number(tree.y),
      data: JSON.stringify({ rayon_m: number(tree.r) }),
    })
  }
  for (const item of Array.isArray(raw.hedges) ? raw.hedges : []) {
    const hedge = record(item)
    rows.push({
      kind: 'haie',
      id: String(hedge.id),
      longitude: null,
      latitude: null,
      data: JSON.stringify({ sommets_lon_lat: hedge.points }),
    })
  }
  const cage = record(raw.cage)
  if (number(cage.x) !== null)
    rows.push({
      kind: 'cage',
      id: 'cage',
      longitude: number(cage.x),
      latitude: number(cage.y),
      data: JSON.stringify({ coin: 'haut gauche' }),
    })
  for (const [id, item] of Object.entries(record(raw.offsets))) {
    const offset = record(item)
    rows.push({
      kind: 'decalage',
      id,
      longitude: null,
      latitude: null,
      data: JSON.stringify({ dx_m: number(offset.dx), dy_m: number(offset.dy) }),
    })
  }
  for (const [id, item] of Object.entries(record(raw.items))) {
    const position = record(item)
    rows.push({ kind: 'objet', id, longitude: number(position.x), latitude: number(position.y), data: '{}' })
  }
  for (const item of Array.isArray(raw.cameras) ? raw.cameras : []) {
    const camera = record(item)
    const id = String(camera.id)
    rows.push({
      kind: 'camera',
      id,
      longitude: number(camera.x),
      latitude: number(camera.y),
      data: JSON.stringify({
        nom: camera.name,
        cap_deg: camera.angle,
        champ_deg: camera.fov,
        proche_m: camera.near,
        loin_m: camera.far,
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

/** Refait la table d'après le plan si celui-ci a changé depuis la dernière fois ; rend le nombre de lignes écrites (0 si rien n'a changé ou si le plan n'est pas en vraies coordonnées). */
export const importPlan = (db: DatabaseSync, plan: unknown, now = Math.floor(Date.now() / 1000)): number => {
  if (plan === null || typeof plan !== 'object') return 0
  const rows = planRows(plan)
  if (rows.length === 0 && record(plan).version !== REAL_COORDINATES) return 0
  const hash = JSON.stringify(rows)
  const known = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(HASH_KEY) as { value: string } | undefined
  if (known?.value === hash) return 0
  const insert = db.prepare(`INSERT INTO ${PLAN_TABLE} (kind, id, longitude, latitude, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
  db.exec('BEGIN')
  try {
    db.exec(`DELETE FROM ${PLAN_TABLE}`)
    for (const row of rows) insert.run(row.kind, row.id, row.longitude, row.latitude, row.data, now)
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
