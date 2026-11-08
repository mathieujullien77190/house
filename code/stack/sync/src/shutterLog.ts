// Le journal des ordres aux volets roulants : House API écrit une ligne JSON par ordre dans un fichier (monté ici en lecture seule), House Sync les
// importe dans la table `shutter_log` de SQLite (onglet Base). Le fichier ne garde que les dernières lignes (l'API le fait tourner) : la table garde tout ;
// la clé d'unicité (happened_at, shutter, command) évite d'importer deux fois la même ligne.
import { readFile } from 'node:fs/promises'
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

/** Une ligne du journal en ligne de table ; null si elle n'a pas la forme attendue. */
export const parseShutter = (line: string) => {
  let raw: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(line)
    if (typeof parsed !== 'object' || parsed === null) return null
    raw = parsed as Record<string, unknown>
  } catch {
    return null
  }
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

/** Importe les lignes nouvelles du fichier (le fichier entier est relu : il est court) ; rend leur nombre. Un fichier absent ne fait rien. */
export const importShutterLog = async (db: DatabaseSync, file: string): Promise<number> => {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch {
    return 0
  }
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ${SHUTTER_LOG_TABLE} (happened_at, shutter, name, command, ok, note) VALUES (:happened_at, :shutter, :name, :command, :ok, :note)`,
  )
  let imported = 0
  db.exec('BEGIN')
  try {
    for (const line of text.split('\n')) {
      const entry = parseShutter(line)
      if (entry) imported += Number(insert.run(entry).changes)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return imported
}
