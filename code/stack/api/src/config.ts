// La configuration de l'API, lue une fois dans l'environnement et validée au démarrage.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export interface Config {
  port: number
  /** Le dossier de la WebApp compilée, servie en statique. */
  webDir: string
  /** Le disque backup écrit par House Sync (base SQLite et clips), monté en lecture seule. */
  dataDir: string
  /** Le dossier où l'API garde ce qu'elle écrit (les positions des ampoules) : le seul qu'elle modifie, avec le PoE du switch. */
  stateDir: string
  /** La clé que l'utilisateur donne depuis la WebApp. */
  apiKey: string
  /** Les go2rtc, sur le réseau Docker (ports internes, jamais publiés) : un par enregistreur ; le premier est celui par défaut. */
  go2rtcUrls: string[]
  /** Le switch PoE (page web, réseau de la maison) et le port de chaque caméra ; null sans mot de passe : poe répond 503. */
  switchPoe: { url: string; user: string; password: string; ports: Record<string, number> } | null
  /** Le pont Philips Hue (réseau de la maison) et sa clé d'application ; null sans clé : hue répond 503. */
  hue: { url: string; key: string } | null
  /** La prise connectée TP-Link Kasa (réseau de la maison, port 9999) ; null sans PLUG_HOST : plug répond 503. */
  plug: { host: string; port: number; mac: string } | null
  /** Le détecteur Hue qui éteint la prise (option « éteindre au mouvement »), par son nom chez le pont. */
  plugMotionSensor: string
  /** La page invité (guest/) : sa clé, son port et, si elle est ouverte à internet, son adresse publique ; null sans GUEST_KEY : /guest répond 503. */
  guest: { key: string; port: number; url: string } | null
  /** Le certificat de la maison ; absent, l'API reste en HTTP (développement). */
  tls: { cert: string; key: string } | null
  /** Le certificat public de l'autorité de la maison, que l'API propose au téléchargement (/rootCA.crt) ; vide : pas de téléchargement. */
  caCert: string
}

const MIN_KEY_LENGTH = 8

/** SWITCH_PORTS : « voliere-exterieur:7,jardin:3 » (caméra:port du switch). */
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
    stateDir: resolve(env.STATE_DIR ?? './state'),
    apiKey,
    go2rtcUrls: (env.GO2RTC_URLS ?? env.GO2RTC_URL ?? 'http://go2rtc:1984')
      .split(',')
      .map((url) => url.trim().replace(/\/$/, ''))
      .filter(Boolean),
    switchPoe: parseSwitch(env),
    hue: env.HUE_APP_KEY && env.HUE_BRIDGE_IP ? { url: `http://${env.HUE_BRIDGE_IP}`, key: env.HUE_APP_KEY } : null,
    plugMotionSensor: env.PLUG_MOTION_SENSOR ?? 'motion interieur',
    plug: env.PLUG_HOST ? { host: env.PLUG_HOST, port: Number(env.PLUG_PORT ?? 9999), mac: env.PLUG_MAC ?? '' } : null,
    guest: env.GUEST_KEY ? { key: env.GUEST_KEY, port: Number(env.GUEST_PORT ?? 8090), url: env.GUEST_PUBLIC_URL ?? '' } : null,
    tls: cert && key && existsSync(cert) && existsSync(key) ? { cert, key } : null,
    caCert: env.CA_CERT ?? '',
  }
}
