// Ce que la page de House Sync lit dans la base et sur le disque backup : fonctions pures, sans HTTP.
import { readdir, stat } from 'node:fs/promises'
import type { DatabaseSync } from 'node:sqlite'

export const TABLES = ['events', 'last_images', 'live_streams', 'snapshots']
export const MAX_PAGE_SIZE = 100

export interface BackupFile {
  path: string
  size: number
  modifiedMs: number
}

export interface TableSummary {
  name: string
  columns: string[]
  count: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

const isTable = (name: string): boolean => TABLES.includes(name)

const columnsOf = (db: DatabaseSync, name: string): string[] =>
  (db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).map((c) => c.name)

/** L'ordre naturel de chaque table : les plus récents d'abord quand il y a un horodatage. */
const orderOf = (columns: string[]): string => {
  if (columns.includes('started_at')) return 'ORDER BY started_at DESC'
  if (columns.includes('taken_at')) return 'ORDER BY taken_at DESC'
  return 'ORDER BY camera'
}

export const summarizeTables = (db: DatabaseSync): TableSummary[] =>
  TABLES.map((name) => ({
    name,
    columns: columnsOf(db, name),
    count: (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n,
  }))

/** Une page d'une table, ou null si la table n'existe pas. */
export const readTable = (db: DatabaseSync, name: string, page: number, size: number): Page<Record<string, unknown>> | null => {
  if (!isTable(name)) return null
  const columns = columnsOf(db, name)
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n
  const items = db.prepare(`SELECT * FROM ${name} ${orderOf(columns)} LIMIT ? OFFSET ?`).all(size, page * size) as Record<string, unknown>[]
  return { items, total, page, size }
}

/** Les fichiers d'un dossier du disque backup, du plus récent au plus ancien, chemins relatifs au disque. */
export const listBackup = async (dir: string, prefix = ''): Promise<BackupFile[]> => {
  const out: BackupFile[] = []
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) out.push(...(await listBackup(`${dir}/${entry.name}`, `${prefix}${entry.name}/`)))
    else if (entry.isFile() && !entry.name.startsWith('events.db') && !entry.name.endsWith('-journal')) {
      const info = await stat(`${dir}/${entry.name}`)
      out.push({ path: `${prefix}${entry.name}`, size: info.size, modifiedMs: info.mtimeMs })
    }
  }
  return out.sort((a, b) => b.modifiedMs - a.modifiedMs)
}

export const sumSize = (files: BackupFile[]): number => files.reduce((sum, f) => sum + f.size, 0)

export const paginate = <T>(items: T[], page: number, size: number): Page<T> => ({
  items: items.slice(page * size, page * size + size),
  total: items.length,
  page,
  size,
})

/** Les paramètres de pagination d'une requête, bornés. */
export const pageParams = (params: URLSearchParams): { page: number; size: number } => ({
  page: Math.max(0, Math.floor(Number(params.get('page') ?? 0)) || 0),
  size: Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(params.get('size') ?? 20)) || 20)),
})
