// Le journal des connexions des invités de la Freebox : House API écrit une ligne JSON par connexion ou déconnexion dans un fichier (monté ici en lecture seule),
// House Sync les importe dans la table `box_connections` de SQLite (onglet Base). Le fichier ne garde que les dernières lignes : la table garde tout ;
// la clé d'unicité (happened_at, mac, event) évite d'importer deux fois la même ligne.
import { readFile } from 'node:fs/promises'
import type { DatabaseSync } from 'node:sqlite'

export const BOX_CONNECTIONS_TABLE = 'box_connections'

export const createBoxConnectionsTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${BOX_CONNECTIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      happened_at INTEGER NOT NULL,
      event TEXT NOT NULL,
      mac TEXT NOT NULL,
      name TEXT NOT NULL,
      ip TEXT,
      type TEXT,
      vendor TEXT,
      UNIQUE (happened_at, mac, event)
    );
    CREATE INDEX IF NOT EXISTS box_connections_happened ON ${BOX_CONNECTIONS_TABLE} (happened_at);
  `)
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value.slice(0, 200) : null)

/** Une ligne du journal en ligne de table ; null si elle n'a pas la forme attendue. */
export const parseConnection = (line: string) => {
  let raw: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(line)
    if (typeof parsed !== 'object' || parsed === null) return null
    raw = parsed as Record<string, unknown>
  } catch {
    return null
  }
  if (typeof raw.at !== 'number' || !Number.isFinite(raw.at)) return null
  if (raw.event !== 'connect' && raw.event !== 'disconnect') return null
  if (typeof raw.mac !== 'string' || typeof raw.name !== 'string') return null
  return { happened_at: Math.floor(raw.at), event: raw.event, mac: raw.mac, name: raw.name.slice(0, 200), ip: text(raw.ip), type: text(raw.type), vendor: text(raw.vendor) }
}

/** Importe les lignes nouvelles du fichier (le fichier entier est relu : il est court) ; rend leur nombre. Un fichier absent ne fait rien. */
export const importBoxConnections = async (db: DatabaseSync, file: string): Promise<number> => {
  let content: string
  try {
    content = await readFile(file, 'utf8')
  } catch {
    return 0
  }
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ${BOX_CONNECTIONS_TABLE} (happened_at, event, mac, name, ip, type, vendor) VALUES (:happened_at, :event, :mac, :name, :ip, :type, :vendor)`,
  )
  let imported = 0
  db.exec('BEGIN')
  try {
    for (const line of content.split('\n')) {
      const entry = parseConnection(line)
      if (entry) imported += Number(insert.run(entry).changes)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return imported
}
