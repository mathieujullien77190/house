// Le journal des activations du chauffage (la prise de la volière), table `heating_log` de SQLite (onglet Base). House API envoie chaque activation à House Sync
// (`POST /api/journal/heating`), seul à écrire dans la base ; la clé d'unicité (started_at, origin) évite deux fois la même ligne. Le coût (`cost`) est calculé par
// l'API au moment de l'activation (tarif et puissance du moment) : House Sync le range sans le recalculer.
import type { DatabaseSync } from 'node:sqlite'

export const HEATING_LOG_TABLE = 'heating_log'

export const createHeatingLogTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${HEATING_LOG_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at INTEGER NOT NULL,
      origin TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      temperature REAL,
      note TEXT,
      cost REAL,
      UNIQUE (started_at, origin)
    );
    CREATE INDEX IF NOT EXISTS heating_log_started ON ${HEATING_LOG_TABLE} (started_at);
  `)
}

const number = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/** Une activation reçue en ligne de table ; null si elle n'a pas la forme attendue. */
export const parseHeating = (raw: Record<string, unknown>) => {
  const at = number(raw.at)
  const minutes = number(raw.minutes)
  if (at === null || minutes === null || (raw.origin !== 'auto' && raw.origin !== 'manuel')) return null
  return {
    started_at: Math.floor(at),
    origin: raw.origin,
    minutes: Math.round(minutes),
    temperature: number(raw.temperature),
    note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : null,
    cost: number(raw.cost),
  }
}

/** Range une activation ; rend vrai si elle est nouvelle, faux si elle est mal formée ou déjà là. */
export const recordHeating = (db: DatabaseSync, raw: Record<string, unknown>): boolean => {
  const entry = parseHeating(raw)
  if (!entry) return false
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ${HEATING_LOG_TABLE} (started_at, origin, minutes, temperature, note, cost) VALUES (:started_at, :origin, :minutes, :temperature, :note, :cost)`,
  )
  return Number(insert.run(entry).changes) > 0
}
