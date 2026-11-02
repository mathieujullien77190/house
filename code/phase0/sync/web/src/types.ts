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
    /** Le disque qui porte le dossier backup : sa taille, ce qui reste libre et ce que le système garde pour root, en octets (0 si illisible). */
    disk: { total: number; free: number; reserved: number }
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

export interface Specs {
  hostname: string
  os: string
  kernel: string
  architecture: string
  uptimeSeconds: number
  bios: string | null
  cpu: { model: string; cores: number; threads: number; maxMhz: number | null } | null
  /** La mémoire vue par le système, en octets. */
  memory: number | null
  disk: { model: string; size: number; rotational: boolean } | null
}

export interface DockerContainer {
  name: string
  service: string
  image: string
  state: string
  exitCode: number | null
  startedAt: string
  restartPolicy: string
  command: string
  ports: string[]
  networks: string[]
  mounts: { type: string; source: string; destination: string; writable: boolean }[]
  /** Les noms des variables d'environnement, jamais leurs valeurs. */
  envNames: string[]
  cpu: string
  memory: string
  memoryPercent: string
  network: string
  disk: string
  layerSize: string
  processes: { pid: string; user: string; cpu: string; mem: string; command: string }[]
}

export interface DockerGlobal {
  engine: {
    version: string | null
    storageDriver: string | null
    loggingDriver: string | null
    cgroupDriver: string | null
    rootDir: string | null
    os: string | null
    kernel: string | null
    cpus: number | null
    memory: number | null
    containers: number | null
    running: number | null
    paused: number | null
    stopped: number | null
    images: number | null
  }
  images: { repository: string; tag: string; size: string; created: string }[]
  networks: { name: string; driver: string; subnet: string; containers: string[] }[]
  diskUsage: { type: string; total: string; active: string; size: string; reclaimable: string }[]
  /** Les réglages du .env ; la valeur est null quand le nom évoque un secret. */
  env: { name: string; value: string | null }[]
}

export interface Docker {
  /** Le service de l'hôte répond-il ? Sinon les conteneurs et la configuration globale manquent. */
  serviceAvailable: boolean
  containers: DockerContainer[]
  global: DockerGlobal | null
  /** Le docker-compose.yml, null s'il ne se lit pas. */
  compose: string | null
  ageSeconds: number
}
