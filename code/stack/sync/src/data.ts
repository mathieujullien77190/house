// Ce que la page de House Sync lit dans la base et sur le disque backup : fonctions pures, sans HTTP.
import { readdir, stat, statfs } from 'node:fs/promises'
import type { DatabaseSync } from 'node:sqlite'

export const TABLES = ['events', 'last_images', 'live_streams', 'snapshots', 'hue_events', 'merges', 'settings', 'guest_visits', 'heating_log', 'plan']
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
  /** Les filtres que la page propose pour cette table : le choix d'une valeur (caméra, nom du matériel Hue) et la date. */
  filters: { match: 'camera' | 'name' | 'cle' | null; date: boolean }
}

/** Ce qu'une table se laisse filtrer : la colonne dont on choisit une valeur, et la colonne d'horodatage (secondes) de la date. */
interface TableFilterConfig {
  match: 'camera' | 'name' | 'cle' | null
  date: string | null
}

export const TABLE_FILTERS: Record<string, TableFilterConfig> = {
  events: { match: 'camera', date: 'started_at' },
  snapshots: { match: 'camera', date: 'taken_at' },
  merges: { match: 'camera', date: 'absorbed_started_at' },
  hue_events: { match: 'name', date: 'happened_at' },
  guest_visits: { match: 'cle', date: 'started_at' },
  heating_log: { match: null, date: 'started_at' },
}

/** Le filtre demandé : une valeur de la colonne choisie, et une période [from, to[ en secondes depuis 1970. */
export interface TableFilters {
  match?: string
  from?: number
  to?: number
}

const finite = (value: string | null): number | undefined => {
  if (value === null || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

/** Les filtres d'une demande (`match`, `from`, `to`) ; ce qui est absent ou invalide est ignoré. */
export const filterParams = (params: URLSearchParams): TableFilters => {
  const match = params.get('match')
  return {
    match: match !== null && match !== '' && match.length <= 100 ? match : undefined,
    from: finite(params.get('from')),
    to: finite(params.get('to')),
  }
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
  if (columns.includes('absorbed_started_at')) return 'ORDER BY absorbed_started_at DESC'
  if (columns.includes('taken_at')) return 'ORDER BY taken_at DESC'
  if (columns.includes('happened_ms')) return 'ORDER BY happened_ms DESC, id DESC'
  if (columns.includes('kind')) return 'ORDER BY kind, id'
  return 'ORDER BY camera'
}

export const summarizeTables = (db: DatabaseSync): TableSummary[] =>
  TABLES.map((name) => ({
    name,
    columns: shown(name, columnsOf(db, name)),
    count: (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n,
    filters: { match: TABLE_FILTERS[name]?.match ?? null, date: TABLE_FILTERS[name]?.date != null },
  }))

/**
 * Une page d'une table, ou null si la table n'existe pas. Avec un filtre : seulement les lignes de la valeur choisie et de la période demandée
 * (les colonnes viennent de TABLE_FILTERS, jamais de la demande ; les valeurs sont des paramètres). `options` : les valeurs possibles du filtre (pour hue_events : les lampes et les détecteurs, ni interrupteurs ni scènes).
 */
export const readTable = (
  db: DatabaseSync,
  name: string,
  page: number,
  size: number,
  filter: TableFilters = {},
): (Page<Record<string, unknown>> & { options: string[] }) | null => {
  if (!isTable(name)) return null
  const columns = columnsOf(db, name)
  const config = TABLE_FILTERS[name]
  const where: string[] = []
  const args: (string | number)[] = []
  if (config?.match && filter.match !== undefined) {
    where.push(`${config.match} = ?`)
    args.push(filter.match)
  }
  if (config?.date && filter.from !== undefined) {
    where.push(`${config.date} >= ?`)
    args.push(filter.from)
  }
  if (config?.date && filter.to !== undefined) {
    where.push(`${config.date} < ?`)
    args.push(filter.to)
  }
  const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM ${name} ${clause}`).get(...args) as { n: number }).n
  const select = shown(name, columns).join(', ')
  const items = db
    .prepare(`SELECT ${select} FROM ${name} ${clause} ${orderOf(columns)} LIMIT ? OFFSET ?`)
    .all(...args, size, page * size) as Record<string, unknown>[]
  const options = config?.match
    ? (
        db
          .prepare(
            `SELECT DISTINCT ${config.match} AS value FROM ${name} WHERE ${config.match} IS NOT NULL${name === 'hue_events' ? " AND resource IN ('light', 'motion')" : ''} ORDER BY value LIMIT 300`,
          )
          .all() as { value: string }[]
      ).map((row) => row.value)
    : []
  return { items, total, page, size, options }
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
    return {
      total: Number(info.blocks) * size,
      free: Number(info.bavail) * size,
      reserved: (Number(info.bfree) - Number(info.bavail)) * size,
    }
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

/** Les filtres de la liste des clips : la caméra, la période (début du clip, secondes depuis 1970) et sauvegardés ou non. */
export interface ClipFilters {
  camera?: string
  from?: number
  to?: number
  /** `ids` : les événements sauvegardés ; `keep` vrai : seulement les sauvegardés, faux : seulement les autres. */
  saved?: { ids: ReadonlySet<string>; keep: boolean }
}

/** La caméra d'un clip, d'après son identifiant (`clips/<caméra>/<id>`), ou null. */
export const clipCamera = (id: string): string | null => /^clips\/([\w-]+)\//.exec(id)?.[1] ?? null

/** Le début d'un clip (secondes depuis 1970), lu dans son nom (`clips/<caméra>/<secondes>.<millièmes>-<caméra>`), ou null. */
export const clipStart = (id: string): number | null => {
  const match = /^clips\/[\w-]+\/(\d+)(?:\.\d+)?-/.exec(id)
  return match ? Number(match[1]) : null
}

/** L'identifiant de l'événement d'un clip : le dernier morceau de son chemin (clips/<caméra>/<id>). */
export const clipEventId = (id: string): string => id.slice(id.lastIndexOf('/') + 1)

/** Les clips qui passent les filtres, dans le même ordre. */
export const filterClips = (groups: ClipGroup[], filter: ClipFilters): ClipGroup[] =>
  groups.filter((group) => {
    if (filter.camera !== undefined && clipCamera(group.id) !== filter.camera) return false
    const start = clipStart(group.id)
    if (filter.from !== undefined && (start === null || start < filter.from)) return false
    if (filter.to !== undefined && (start === null || start >= filter.to)) return false
    if (filter.saved && filter.saved.ids.has(clipEventId(group.id)) !== filter.saved.keep) return false
    return true
  })

/** Les caméras qui ont des clips, par ordre alphabétique. */
export const clipCameras = (groups: ClipGroup[]): string[] =>
  [...new Set(groups.map((group) => clipCamera(group.id)).filter((camera): camera is string => camera !== null))].sort()

/** Les filtres d'une demande de clips : `camera`, `from`, `to` et `saved` (`1` : les sauvegardés, `0` : les autres, absent : tous). */
export const clipFilterParams = (
  params: URLSearchParams,
): { camera?: string; from?: number; to?: number; saved: 'saved' | 'others' | null } => {
  const camera = params.get('camera')
  const saved = params.get('saved')
  return {
    camera: camera !== null && /^[\w-]+$/.test(camera) ? camera : undefined,
    from: finite(params.get('from')),
    to: finite(params.get('to')),
    saved: saved === '1' ? 'saved' : saved === '0' ? 'others' : null,
  }
}
