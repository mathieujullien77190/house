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
    /** Le disque qui porte le dossier backup : sa taille et ce qui reste libre, en octets (0 si illisible). */
    disk: { total: number; free: number }
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

export interface Power {
  /** La puissance du processeur ; null si la mesure manque (service de l'hôte arrêté, machine sans RAPL). */
  cpu: { watts: number; ageSeconds: number } | null
  /** Le PoE de chaque caméra, lu chez le switch ; null quand il n'a pas pu l'être. */
  cameras: { camera: string; watts: number; powered: boolean }[] | null
  camerasError: string | null
}

export interface System {
  /** La mémoire en octets ; null si elle ne se lit pas. */
  memory: { total: number; available: number } | null
  /** Le processeur : part utilisée (0 à 100), threads et charge moyenne sur une minute. */
  cpu: { percent: number; threads: number; load1: number } | null
}
