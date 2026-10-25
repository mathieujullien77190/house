// La configuration de l'API, lue une fois dans l'environnement et validée au démarrage.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export interface Config {
  port: number
  /** Le dossier de la WebApp compilée, servie en statique. */
  webDir: string
  /** Le disque backup écrit par House Sync (base SQLite et clips), monté en lecture seule. */
  dataDir: string
  /** La clé que l'utilisateur donne depuis la WebApp. */
  apiKey: string
  /** Les go2rtc, sur le réseau Docker (ports internes, jamais publiés) : un par enregistreur ; le premier est celui par défaut. */
  go2rtcUrls: string[]
  /** Le switch PoE (page web, réseau de la maison) et le port de chaque caméra ; null sans mot de passe : poe répond 503. */
  switchPoe: { url: string; user: string; password: string; ports: Record<string, number> } | null
  /** Le certificat de la maison ; absent, l'API reste en HTTP (développement). */
  tls: { cert: string; key: string } | null
}

const MIN_KEY_LENGTH = 8

/** SWITCH_PORTS : « portail:7,jardin:3 » (caméra:port du switch). */
const parseSwitch = (env: NodeJS.ProcessEnv): Config['switchPoe'] => {
  const password = env.SWITCH_PASSWORD ?? ''
  if (!password) return null
  const ports: Record<string, number> = {}
  for (const pair of (env.SWITCH_PORTS ?? '').split(',')) {
    const [camera, port] = pair.split(':').map((part) => part.trim())
    if (camera && /^[1-8]$/.test(port ?? '')) ports[camera] = Number(port)
  }
  return { url: env.SWITCH_URL ?? 'http://192.168.1.33', user: env.SWITCH_USER ?? 'admin', password, ports }
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const apiKey = env.API_KEY ?? ''
  if (apiKey.length < MIN_KEY_LENGTH) {
    throw new Error(`API_KEY absente ou trop courte (${MIN_KEY_LENGTH} caractères au moins) : l’API ne démarre pas.`)
  }
  const cert = env.TLS_CERT ?? ''
  const key = env.TLS_KEY ?? ''
  return {
    port: Number(env.PORT ?? 8080),
    webDir: resolve(env.WEB_DIR ?? './web'),
    dataDir: resolve(env.DATA_DIR ?? './data'),
    apiKey,
    go2rtcUrls: (env.GO2RTC_URLS ?? env.GO2RTC_URL ?? 'http://go2rtc:1984')
      .split(',')
      .map((url) => url.trim().replace(/\/$/, ''))
      .filter(Boolean),
    switchPoe: parseSwitch(env),
    tls: cert && key && existsSync(cert) && existsSync(key) ? { cert, key } : null,
  }
}
