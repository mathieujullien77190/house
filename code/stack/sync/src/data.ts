// Ce que la page de House Sync lit dans la base et sur le disque backup : fonctions pures, sans HTTP.
import { readdir, stat, statfs } from 'node:fs/promises'
import type { DatabaseSync } from 'node:sqlite'

export const TABLES = ['events', 'last_images', 'live_streams', 'snapshots', 'hue_events', 'merges', 'settings']
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

/** Colonnes gardées pour le tri ou la requête, mais pas montrées dans la page (hue_events.happened_ms double happened_at, en millisecondes). */
const HIDDEN: Record<string, string[]> = { hue_events: ['happened_ms'] }

const shown = (name: string, columns: string[]): string[] => columns.filter((c) => !(HIDDEN[name] ?? []).includes(c))

const columnsOf = (db: DatabaseSync, name: string): string[] =>
  (db.prepare(`PRAGMA table_info(${name})`).all() as { name: string }[]).map((c) => c.name)

/** L'ordre naturel de chaque table : les plus récents d'abord quand il y a un horodatage. */
const orderOf = (columns: string[]): string => {
  if (columns.includes('started_at')) return 'ORDER BY started_at DESC'
  if (columns.includes('taken_at')) return 'ORDER BY taken_at DESC'
  if (columns.includes('happened_ms')) return 'ORDER BY happened_ms DESC, id DESC'
  return 'ORDER BY camera'
}

export const summarizeTables = (db: DatabaseSync): TableSummary[] =>
  TABLES.map((name) => ({
    name,
    columns: shown(name, columnsOf(db, name)),
    count: (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n,
  }))

/** Une page d'une table, ou null si la table n'existe pas. */
export const readTable = (db: DatabaseSync, name: string, page: number, size: number): Page<Record<string, unknown>> | null => {
  if (!isTable(name)) return null
  const columns = columnsOf(db, name)
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n
  const select = shown(name, columns).join(', ')
  const items = db.prepare(`SELECT ${select} FROM ${name} ${orderOf(columns)} LIMIT ? OFFSET ?`).all(size, page * size) as Record<string, unknown>[]
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

/** Un clip du disque backup : ses deux versions réunies, l'original (H.265 4K) et la copie légère (H.264 720p). */
export interface ClipGroup {
  /** Le clip sans extension : clips/<caméra>/<id>. */
  id: string
  original: BackupFile | null
  light: BackupFile | null
  /** La plus récente des deux versions. */
  modifiedMs: number
}

const LIGHT_SUFFIX = '.h264.mp4'

/** Réunit les fichiers de clips (<id>.mp4 et <id>.h264.mp4) en un clip par événement, du plus récent au plus ancien. */
export const groupClips = (files: BackupFile[]): ClipGroup[] => {
  const groups = new Map<string, ClipGroup>()
  for (const file of files) {
    const isLight = file.path.endsWith(LIGHT_SUFFIX)
    const id = file.path.slice(0, file.path.length - (isLight ? LIGHT_SUFFIX.length : '.mp4'.length))
    const group = groups.get(id) ?? { id, original: null, light: null, modifiedMs: 0 }
    if (isLight) group.light = file
    else group.original = file
    group.modifiedMs = Math.max(group.modifiedMs, file.modifiedMs)
    groups.set(id, group)
  }
  return [...groups.values()].sort((a, b) => b.modifiedMs - a.modifiedMs)
}

export interface DiskSpace {
  /** La taille du disque qui porte le dossier, en octets. */
  total: number
  /** Ce qui reste libre pour un programme sans droits particuliers. */
  free: number
  /** Ce que le système de fichiers garde pour root (5 % sur ext4) : libre, mais pas pour les programmes ordinaires. */
  reserved: number
}

/** La place du disque qui porte un dossier ; 0 et 0 si elle ne se lit pas. */
export const readDiskSpace = async (dir: string): Promise<DiskSpace> => {
  try {
    const info = await statfs(dir)
    const size = Number(info.bsize)
    return { total: Number(info.blocks) * size, free: Number(info.bavail) * size, reserved: (Number(info.bfree) - Number(info.bavail)) * size }
  } catch {
    return { total: 0, free: 0, reserved: 0 }
  }
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
