// Les visites de la page invité (guest/) : la page écrit une ligne JSON par visite dans un fichier (monté ici en lecture seule), House Sync les importe
// dans la table `guest_visits` de SQLite (qui apparaît dans l'onglet Base) : qui est venu (adresse, réseau, navigateur), quand, ce qu'il a regardé
// et combien de temps. Rien n'est supprimé du fichier (c'est la page qui le fait tourner) ; la position déjà lue est gardée dans `app_settings`.
import { open, stat } from 'node:fs/promises'
import type { DatabaseSync } from 'node:sqlite'

export const GUEST_VISITS_TABLE = 'guest_visits'
const OFFSET_KEY = 'guest_visits_offset'
/** On lit au plus ça à chaque tour (le reste au tour suivant). */
const MAX_CHUNK = 1024 * 1024

export const createGuestVisitsTable = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${GUEST_VISITS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      kind TEXT NOT NULL,
      ip TEXT NOT NULL,
      origin TEXT NOT NULL,
      device TEXT NOT NULL,
      camera TEXT,
      quality TEXT,
      status INTEGER,
      duration_seconds REAL,
      bytes INTEGER,
      path TEXT,
      language TEXT,
      host TEXT,
      user_agent TEXT,
      cle TEXT
    );
    CREATE INDEX IF NOT EXISTS guest_visits_started ON ${GUEST_VISITS_TABLE} (started_at);
    CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
  // La colonne cle (« avec clé », « sans clé », « clé fausse ») est venue après la table : une base existante la reçoit ici, et ses visites de page ou de flux, qui ont toutes présenté la bonne clé, la prennent.
  const columns = db.prepare(`PRAGMA table_info(${GUEST_VISITS_TABLE})`).all() as { name: string }[]
  if (!columns.some((column) => column.name === 'cle')) db.exec(`ALTER TABLE ${GUEST_VISITS_TABLE} ADD COLUMN cle TEXT`)
  db.exec(`UPDATE ${GUEST_VISITS_TABLE} SET cle = 'avec clé' WHERE cle IS NULL AND kind IN ('page', 'stream')`)
}

const text = (value: unknown, max = 300): string => (typeof value === 'string' ? value.slice(0, max) : '')
const number = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/** Une ligne du journal en ligne de table ; null si elle n'a pas la forme attendue. */
export const parseVisit = (line: string) => {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(line) as Record<string, unknown>
  } catch {
    return null
  }
  const at = number(raw.at)
  const kind = raw.kind
  if (at === null || (kind !== 'page' && kind !== 'stream' && kind !== 'refused')) return null
  const duration = number(raw.duration)
  return {
    started_at: Math.floor(at),
    ended_at: duration === null ? null : Math.floor(at + duration),
    kind,
    ip: text(raw.ip, 80),
    origin: text(raw.origin, 40),
    device: text(raw.device, 80),
    camera: text(raw.camera, 80) || null,
    quality: text(raw.quality, 20) || null,
    status: number(raw.status),
    duration_seconds: duration === null ? null : Math.round(duration * 10) / 10,
    bytes: number(raw.bytes),
    path: text(raw.path, 200),
    language: text(raw.language, 20),
    host: text(raw.host, 100),
    user_agent: text(raw.user_agent, 200),
    cle: text(raw.key, 20) || null,
  }
}

/**
 * Importe les lignes ajoutées au fichier depuis le dernier tour (seulement les lignes complètes) ; rend leur nombre. Un fichier plus court que la
 * position gardée (la page l'a fait tourner) est relu depuis le début ; un fichier absent ne fait rien.
 */
export const importGuestVisits = async (db: DatabaseSync, file: string): Promise<number> => {
  let size: number
  try {
    size = (await stat(file)).size
  } catch {
    return 0
  }
  const saved = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(OFFSET_KEY) as { value: string } | undefined
  let offset = Number(saved?.value ?? 0)
  if (!Number.isInteger(offset) || offset < 0 || offset > size) offset = 0
  if (size === offset) return 0
  const length = Math.min(size - offset, MAX_CHUNK)
  const buffer = Buffer.alloc(length)
  const handle = await open(file, 'r')
  try {
    await handle.read(buffer, 0, length, offset)
  } finally {
    await handle.close()
  }
  const lastNewline = buffer.lastIndexOf(0x0a)
  if (lastNewline < 0) return 0
  const lines = buffer.subarray(0, lastNewline).toString('utf8').split('\n').filter(Boolean)
  const insert = db.prepare(
    `INSERT INTO ${GUEST_VISITS_TABLE} (started_at, ended_at, kind, ip, origin, device, camera, quality, status, duration_seconds, bytes, path, language, host, user_agent, cle)
     VALUES (:started_at, :ended_at, :kind, :ip, :origin, :device, :camera, :quality, :status, :duration_seconds, :bytes, :path, :language, :host, :user_agent, :cle)`,
  )
  let imported = 0
  db.exec('BEGIN')
  try {
    for (const line of lines) {
      const visit = parseVisit(line)
      if (!visit) continue
      insert.run(visit)
      imported += 1
    }
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(OFFSET_KEY, String(offset + lastNewline + 1))
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return imported
}

/** Supprime les visites de plus de `days` jours ; rend leur nombre. */
export const purgeGuestVisits = (db: DatabaseSync, days: number, nowSeconds: number = Math.floor(Date.now() / 1000)): number =>
  Number(db.prepare(`DELETE FROM ${GUEST_VISITS_TABLE} WHERE started_at < ?`).run(nowSeconds - days * 86_400).changes)
