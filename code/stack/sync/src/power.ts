// La consommation que montre la page de House Sync : la puissance du processeur (fichier écrit sur l'hôte par
// `power/house-power.sh`) et celle de chaque caméra (le PoE lu par House API chez le switch) ; les lampes Hue (estimation de House API) pour l'énergie.
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

export interface LampPower {
  /** Le nom de la lampe chez le pont Hue. */
  lamp: string
  /** La puissance estimée par House API (`watts` de `GET /hue`). */
  watts: number
}

/**
 * Les lampes Hue **placées dans une zone de la maison** (identifiants du pont) : celles de la page Lumière hors du groupe « À placer ». Seules elles comptent dans la consommation. **Copie assumée**
 * des lampes de `ZONES` dans `web/src/components/Lights/constants.ts` : si l'un change, changer l'autre.
 */
export const PLACED_LAMPS: ReadonlySet<string> = new Set(['15', '9', '10', '19', '8', '6', '4', '28', '13', '14', '3', '5', '7', '27', '11', '16', '18', '22', '26'])

/** Les lampes de `GET /hue` (pièces et leurs lampes), chacune une fois même si plusieurs pièces la citent ; une lampe sans estimation (`watts` nul) ou « à placer » (hors de `PLACED_LAMPS`) est laissée de côté. */
export const parseLamps = (data: unknown): LampPower[] | null => {
  if (!Array.isArray(data)) return null
  const lamps = new Map<string, LampPower>()
  for (const room of data as { lights?: unknown }[]) {
    if (!Array.isArray(room?.lights)) continue
    for (const item of room.lights as { id?: unknown; name?: unknown; watts?: unknown }[]) {
      if (
        (typeof item.id === 'string' || typeof item.id === 'number') &&
        PLACED_LAMPS.has(String(item.id)) &&
        typeof item.name === 'string' &&
        typeof item.watts === 'number'
      ) {
        lamps.set(String(item.id), { lamp: item.name, watts: item.watts })
      }
    }
  }
  return [...lamps.values()]
}

/** Lit `path` chez House API (même clé, même CA) et le passe à `parse` ; échoue avec un message lisible. */
const fetchApi = <T>(target: ApiTarget, path: string, parse: (data: unknown) => T | null): Promise<T> =>
  new Promise((resolve, reject) => {
    const req = request(
      `${target.url}${path}`,
      { headers: { 'X-House-Key': target.key }, ca: target.ca, servername: target.servername, timeout: 8000 },
      (res) => {
        let text = ''
        res.setEncoding('utf8')
        res.on('data', (chunk: string) => (text += chunk))
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`API : réponse ${res.statusCode}`))
          try {
            const parsed = parse(JSON.parse(text))
            if (parsed) resolve(parsed)
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

/** L'état PoE des caméras, lu chez House API (`GET /poe`). */
export const fetchCameraPower = (target: ApiTarget): Promise<CameraPower[]> => fetchApi(target, '/poe', parseCameras)

/** La puissance estimée des lampes Hue, lue chez House API (`GET /hue`). */
export const fetchLampPower = (target: ApiTarget): Promise<LampPower[]> => fetchApi(target, '/hue', parseLamps)

export const readPower = async (cpuFile: string, target: ApiTarget | null): Promise<PowerReport> => {
  const cpu = await readCpuPower(cpuFile)
  if (!target) return { cpu, cameras: null, camerasError: 'API non configurée' }
  try {
    return { cpu, cameras: await fetchCameraPower(target), camerasError: null }
  } catch (error) {
    return { cpu, cameras: null, camerasError: error instanceof Error ? error.message : String(error) }
  }
}
