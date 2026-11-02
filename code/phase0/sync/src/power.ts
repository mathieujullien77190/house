// La consommation que montre la page de House Sync : la puissance du processeur (fichier écrit sur l'hôte par
// `power/house-power.sh`) et celle de chaque caméra (le PoE lu par House API chez le switch).
import { readFile } from 'node:fs/promises'
import { request } from 'node:https'

export interface CpuPower {
  watts: number
  /** Âge de la mesure, en secondes. */
  ageSeconds: number
}

export interface CameraPower {
  camera: string
  watts: number
  powered: boolean
}

export interface PowerReport {
  cpu: CpuPower | null
  cameras: CameraPower[] | null
  /** Pourquoi les caméras manquent, quand elles manquent. */
  camerasError: string | null
}

/** Au-delà de cet âge, la mesure du processeur est jugée perdue (le service de l'hôte est arrêté). */
const MAX_AGE_SECONDS = 60

export const parseCpuPower = (text: string, nowSeconds: number): CpuPower | null => {
  try {
    const data = JSON.parse(text) as { watts?: unknown; at?: unknown }
    if (typeof data.watts !== 'number' || typeof data.at !== 'number') return null
    const ageSeconds = Math.max(0, nowSeconds - data.at)
    return ageSeconds > MAX_AGE_SECONDS ? null : { watts: data.watts, ageSeconds }
  } catch {
    return null
  }
}

export const readCpuPower = async (file: string): Promise<CpuPower | null> =>
  parseCpuPower(await readFile(file, 'utf8').catch(() => ''), Math.floor(Date.now() / 1000))

export const parseCameras = (data: unknown): CameraPower[] | null => {
  if (!Array.isArray(data)) return null
  return data.flatMap((item) => {
    const entry = item as { camera?: unknown; watts?: unknown; powered?: unknown }
    return typeof entry.camera === 'string' && typeof entry.watts === 'number'
      ? [{ camera: entry.camera, watts: entry.watts, powered: entry.powered === true }]
      : []
  })
}

export interface ApiTarget {
  /** Par exemple https://api:8080 */
  url: string
  key: string
  /** La CA de la maison, qui signe le certificat de l'API. */
  ca: string
  /** Un nom du certificat (l'API est jointe par « api », qui n'y figure pas). */
  servername: string
}

/** L'état PoE des caméras, lu chez House API (même clé) ; échoue avec un message lisible. */
export const fetchCameraPower = (target: ApiTarget): Promise<CameraPower[]> =>
  new Promise((resolve, reject) => {
    const req = request(
      `${target.url}/poe`,
      { headers: { 'X-House-Key': target.key }, ca: target.ca, servername: target.servername, timeout: 8000 },
      (res) => {
        let text = ''
        res.setEncoding('utf8')
        res.on('data', (chunk: string) => (text += chunk))
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`API : réponse ${res.statusCode}`))
          try {
            const cameras = parseCameras(JSON.parse(text))
            if (cameras) resolve(cameras)
            else reject(new Error('API : réponse inattendue'))
          } catch {
            reject(new Error('API : réponse illisible'))
          }
        })
      },
    )
    req.on('error', (error) => reject(new Error(`API : ${error.message}`)))
    req.on('timeout', () => req.destroy(new Error('pas de réponse')))
    req.end()
  })

export const readPower = async (cpuFile: string, target: ApiTarget | null): Promise<PowerReport> => {
  const cpu = await readCpuPower(cpuFile)
  if (!target) return { cpu, cameras: null, camerasError: 'API non configurée' }
  try {
    return { cpu, cameras: await fetchCameraPower(target), camerasError: null }
  } catch (error) {
    return { cpu, cameras: null, camerasError: error instanceof Error ? error.message : String(error) }
  }
}
