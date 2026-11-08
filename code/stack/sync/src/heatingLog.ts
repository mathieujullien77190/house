// Le journal des activations du chauffage (la prise de la volière) : House API écrit une ligne JSON par activation dans un fichier (monté ici en lecture
// seule), House Sync les importe dans la table `heating_log` de SQLite (onglet Base). Le fichier ne garde que les dernières lignes (l'API le fait tourner) :
// la table garde tout ; la clé d’unicité (started_at, origin) évite d'importer deux fois la même ligne. Le coût (`cost`) est calculé par l'API au moment de
// l'activation (tarif et puissance du moment) : House Sync le recopie sans le recalculer.
import { readFile } from 'node:fs/promises'
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

/** Une ligne du journal en ligne de table ; null si elle n'a pas la forme attendue. */
export const parseHeating = (line: string) => {
  let raw: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(line)
    if (typeof parsed !== 'object' || parsed === null) return null
    raw = parsed as Record<string, unknown>
  } catch {
    return null
  }
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

/** Importe les lignes nouvelles du fichier (le fichier entier est relu : il est court) ; rend leur nombre. Un fichier absent ne fait rien. */
export const importHeatingLog = async (db: DatabaseSync, file: string): Promise<number> => {
  let text: string
  try {
    text = await readFile(file, 'utf8')
  } catch {
    return 0
  }
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ${HEATING_LOG_TABLE} (started_at, origin, minutes, temperature, note, cost) VALUES (:started_at, :origin, :minutes, :temperature, :note, :cost)`,
  )
  let imported = 0
  db.exec('BEGIN')
  try {
    for (const line of text.split('\n')) {
      const entry = parseHeating(line)
      if (entry) imported += Number(insert.run(entry).changes)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return imported
}
