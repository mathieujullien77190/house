import https from 'node:https'
// Client du pont Philips Hue (API locale v1, HTTP sur le réseau de la maison) : la clé d'application est dans l'adresse.
// Le pont donne une clé après un appui sur son bouton (POST /api) ; elle vit dans HUE_APP_KEY (.env), jamais dans le code.

export interface HueConfig {
  /** Adresse du pont, par exemple http://192.168.1.81. */
  url: string
  key: string
}

export interface HueLight {
  name: string
  state: { on: boolean; bri?: number; reachable: boolean }
}

export interface HueGroup {
  name: string
  type: string
  lights: string[]
  state: { any_on: boolean; all_on: boolean }
  action: { on: boolean; bri?: number }
}

/** Un capteur du pont : un détecteur Hue en compte trois (mouvement, luminosité, température), liés par l'adresse radio de leur uniqueid. */
export interface HueSensor {
  name: string
  type: string
  uniqueid?: string
  state: { presence?: boolean | null; lightlevel?: number | null; dark?: boolean | null; temperature?: number | null; lastupdated?: string }
  config: { battery?: number; reachable?: boolean }
}

export interface HueState {
  on?: boolean
  /** Luminosité, de 1 à 254. */
  bri?: number
}

export interface HueClient {
  /** Une ressource de l'API v2 du pont (en HTTPS, avec le certificat du pont, que l'on n'authentifie pas : c'est un équipement du réseau de la maison). */
  v2: <T>(path: string) => Promise<T[]>
  sensors: () => Promise<Record<string, HueSensor>>
  lights: () => Promise<Record<string, HueLight>>
  groups: () => Promise<Record<string, HueGroup>>
  /** Change l'état d'une lampe ou d'une pièce : { on?, bri? }. */
  setLight: (id: string, state: HueState) => Promise<void>
  setGroup: (id: string, state: HueState) => Promise<void>
}

const TIMEOUT_MS = 5000

export const createHueClient = (config: HueConfig): HueClient => {
  const base = `${config.url.replace(/\/$/, '')}/api/${config.key}`
  const call = async <T>(method: 'GET' | 'PUT', path: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`pont Hue : HTTP ${res.status}`)
    const data = (await res.json()) as unknown
    // Le pont répond 200 avec un tableau d'erreurs (clé refusée, lampe inconnue...).
    const error = Array.isArray(data) ? (data as { error?: { description?: string } }[]).find((item) => item.error)?.error : undefined
    if (error) throw new Error(`pont Hue : ${error.description ?? 'erreur'}`)
    return data as T
  }
  const host = new URL(config.url).host
  const v2 = <T>(path: string): Promise<T[]> =>
    new Promise((resolve, reject) => {
      const request = https.get(
        { host, path: `/clip/v2/resource/${path}`, headers: { 'hue-application-key': config.key }, rejectUnauthorized: false, timeout: TIMEOUT_MS },
        (res) => {
          let body = ''
          res.setEncoding('utf8')
          res.on('data', (chunk: string) => (body += chunk))
          res.on('close', () => {
            if (!res.complete) reject(new Error('pont Hue v2 : réponse coupée'))
          })
          res.on('end', () => {
            if (res.statusCode !== 200) return reject(new Error(`pont Hue v2 : HTTP ${res.statusCode}`))
            try {
              resolve((JSON.parse(body) as { data: T[] }).data)
            } catch (error) {
              reject(error)
            }
          })
        },
      )
      request.on('timeout', () => request.destroy(new Error('pont Hue v2 : délai dépassé')))
      request.on('error', reject)
    })
  return {
    v2,
    sensors: () => call<Record<string, HueSensor>>('GET', '/sensors'),
    lights: () => call<Record<string, HueLight>>('GET', '/lights'),
    groups: () => call<Record<string, HueGroup>>('GET', '/groups'),
    setLight: async (id, state) => void (await call('PUT', `/lights/${id}/state`, state)),
    setGroup: async (id, state) => void (await call('PUT', `/groups/${id}/action`, state)),
  }
}
