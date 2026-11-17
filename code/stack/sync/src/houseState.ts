// Les documents que l'utilisateur change depuis la WebApp (clips sauvegardés, notes et emojis des clips, zones, repères, plan, positions des lampes, réglages du chauffage, volets
// automatiques, garde de la prise) : la table `house_state` de SQLite, une ligne par document (clé, JSON, date). House API les écrit (action de l'utilisateur) et les relit ; House Sync
// lit ceux dont il a besoin (zones, clips sauvegardés, plan). Avant, chaque document était un fichier JSON de `data/house` : au démarrage, House Sync reprend une seule fois chaque fichier
// dont la clé n'existe pas encore (les fichiers ne sont plus lus ensuite).
import { existsSync, readFileSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'

export const HOUSE_STATE_TABLE = 'house_state'

/** La clé de chaque document et le fichier de `data/house` dont il vient. */
export const HOUSE_FILES: Record<string, string> = {
  'saved-clips': 'saved-clips.json',
  'clip-notes': 'clip-notes.json',
  'clip-emojis': 'clip-emojis.json',
  zones: 'zones.json',
  markers: 'markers.json',
  plan: 'plan.json',
  'lights-positions': 'lights-positions.json',
  heating: 'heating.json',
  'shutters-auto': 'shutters-auto.json',
  'plug-guard': 'plug-guard.json',
}

export const createHouseStateTable = (db: DatabaseSync): void => {
  db.exec(`CREATE TABLE IF NOT EXISTS ${HOUSE_STATE_TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)`)
}

/** Le document de cette clé (texte JSON), ou null s'il n'existe pas. */
export const readState = (db: DatabaseSync, key: string): string | null => {
  const row = db.prepare(`SELECT value FROM ${HOUSE_STATE_TABLE} WHERE key = ?`).get(key) as { value: string } | undefined
  return row ? row.value : null
}

/** Reprend les anciens fichiers de `dir` (et ceux de `extra`, clé vers chemin) dont la clé manque ; un fichier absent ou qui n'est pas du JSON est laissé de côté. Rend le nombre de documents repris. */
export const migrateHouseState = (db: DatabaseSync, dir: string, nowSeconds: number, extra: Record<string, string> = {}): number => {
  let imported = 0
  const insert = db.prepare(`INSERT OR IGNORE INTO ${HOUSE_STATE_TABLE} (key, value, updated_at) VALUES (?, ?, ?)`)
  const files = [...Object.entries(HOUSE_FILES).map(([key, name]): [string, string] => [key, `${dir}/${name}`]), ...Object.entries(extra)]
  for (const [key, file] of files) {
    if (readState(db, key) !== null || !existsSync(file)) continue
    try {
      const text = readFileSync(file, 'utf8')
      JSON.parse(text)
      imported += Number(insert.run(key, text, nowSeconds).changes)
    } catch {
      // fichier illisible : laissé tel quel, rien n'est repris
    }
  }
  return imported
}
