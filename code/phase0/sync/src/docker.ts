// L'état des conteneurs Docker que montre la page de House Sync : le fichier que le service de l'hôte écrit
// (power/house-docker.py). House Sync ne parle jamais au socket Docker : ce serait un accès root à la machine.
import { readFile } from 'node:fs/promises'

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
  /** Les réglages du .env ; la valeur est null quand le nom évoque un secret (mot de passe, clé). */
  env: { name: string; value: string | null }[]
}

export interface DockerReport {
  /** Le service de l'hôte répond-il ? Sinon les conteneurs et la configuration globale manquent. */
  serviceAvailable: boolean
  containers: DockerContainer[]
  /** La configuration globale, absente d'un fichier écrit par une ancienne version du service. */
  global: DockerGlobal | null
  /** Le docker-compose.yml tel qu'il est lancé (références ${VARIABLE} seulement, pas de secret), null s'il ne se lit pas. */
  compose: string | null
  /** Âge de la mesure du service, en secondes. */
  ageSeconds: number
}

/** Au-delà de cet âge, la mesure est jugée perdue (le service de l'hôte est arrêté). */
const MAX_AGE_SECONDS = 120

export interface ServiceReport {
  containers: DockerContainer[]
  global: DockerGlobal | null
  ageSeconds: number
}

export const parseDocker = (content: string, nowSeconds: number): ServiceReport | null => {
  try {
    const data = JSON.parse(content) as { at?: unknown; containers?: unknown; global?: unknown }
    if (typeof data.at !== 'number' || !Array.isArray(data.containers)) return null
    const ageSeconds = Math.max(0, nowSeconds - data.at)
    const global = data.global && typeof data.global === 'object' ? (data.global as DockerGlobal) : null
    return ageSeconds > MAX_AGE_SECONDS ? null : { containers: data.containers as DockerContainer[], global, ageSeconds }
  } catch {
    return null
  }
}

/** Le rapport de la page : ce que le service de l'hôte écrit, et le docker-compose.yml lu directement. */
export const readDocker = async (file: string, composeFile: string): Promise<DockerReport> => {
  const service = parseDocker(await readFile(file, 'utf8').catch(() => ''), Math.floor(Date.now() / 1000))
  const compose = (await readFile(composeFile, 'utf8').catch(() => '')) || null
  return service
    ? { serviceAvailable: true, ...service, compose }
    : { serviceAvailable: false, containers: [], global: null, compose, ageSeconds: 0 }
}
