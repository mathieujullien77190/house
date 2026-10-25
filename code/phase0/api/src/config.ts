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
  /** go2rtc, embarqué dans Frigate, sur le réseau Docker (port interne, jamais publié) : le direct et l'image à l'instant. */
  go2rtcUrl: string
  /** Le certificat de la maison ; absent, l'API reste en HTTP (développement). */
  tls: { cert: string; key: string } | null
}

const MIN_KEY_LENGTH = 8

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
    go2rtcUrl: (env.GO2RTC_URL ?? 'http://frigate:1984').replace(/\/$/, ''),
    tls: cert && key && existsSync(cert) && existsSync(key) ? { cert, key } : null,
  }
}
