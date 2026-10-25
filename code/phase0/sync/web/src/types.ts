/** Ce que renvoient les services de House Sync. */

export interface TableSummary {
  name: string
  columns: string[]
  count: number
}

export interface Overview {
  database: { path: string; size: number; tables: TableSummary[] }
  backup: {
    path: string
    clips: { count: number; size: number }
    snapshots: { count: number; size: number }
  }
}

export type Cell = string | number | null

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export type Row = Record<string, Cell>

export interface BackupFile {
  path: string
  size: number
  modifiedMs: number
}

/** Un fichier du disque backup à montrer dans le panneau : un clip (vidéo) ou une image. */
export interface Media {
  path: string
  kind: 'video' | 'image'
}
