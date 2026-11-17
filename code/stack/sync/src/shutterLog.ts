// Le journal des ordres aux volets roulants, table `shutter_log` de SQLite (onglet Base). House API envoie chaque ordre à House Sync (`POST /api/journal/shutters`),
// seul à écrire dans la base ; la clé d'unicité (happened_at, shutter, command) évite deux fois la même ligne.
import type { DatabaseSync } from 'node:sqlite'

export const SHUTTER_LOG_TABLE = 'shutter_log'
const COMMANDS = ['up', 'down', 'stop']

export const createShutterLogTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${SHUTTER_LOG_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      happened_at INTEGER NOT NULL,
      shutter TEXT NOT NULL,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      ok INTEGER NOT NULL,
      note TEXT,
      UNIQUE (happened_at, shutter, command)
    );
    CREATE INDEX IF NOT EXISTS shutter_log_happened ON ${SHUTTER_LOG_TABLE} (happened_at);
  `)
}

/** Un ordre reçu en ligne de table ; null s'il n'a pas la forme attendue. */
export const parseShutter = (raw: Record<string, unknown>) => {
  if (typeof raw.at !== 'number' || !Number.isFinite(raw.at)) return null
  if (typeof raw.shutter !== 'string' || typeof raw.name !== 'string' || typeof raw.ok !== 'boolean') return null
  if (typeof raw.command !== 'string' || !COMMANDS.includes(raw.command)) return null
  return {
    happened_at: Math.floor(raw.at),
    shutter: raw.shutter,
    name: raw.name,
    command: raw.command,
    ok: raw.ok ? 1 : 0,
    note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : null,
  }
}

/** Range un ordre ; rend vrai s'il est nouveau, faux s'il est mal formé ou déjà là. */
export const recordShutter = (db: DatabaseSync, raw: Record<string, unknown>): boolean => {
  const entry = parseShutter(raw)
  if (!entry) return false
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ${SHUTTER_LOG_TABLE} (happened_at, shutter, name, command, ok, note) VALUES (:happened_at, :shutter, :name, :command, :ok, :note)`,
  )
  return Number(insert.run(entry).changes) > 0
}
