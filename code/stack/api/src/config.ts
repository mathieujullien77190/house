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
  /** Les climatisations Mitsubishi (AC_UNITS="salon:Salon:192.168.1.130" : identifiant, nom, adresse du module Wi-Fi de l'unité, séparés par des virgules) ; vide : ac répond 503. */
  acUnits: { id: string; name: string; host: string }[]
  /** Les volets roulants (SHUTTERS="1:Salon,2:Chambre:19" : le numéro du volet dans le firmware de l'ESP32, son nom, puis, facultatif, le temps qu'il met à se fermer en entier, en secondes : il donne le bouton « Fermer à moitié ») ; vide : shutters répond 503. Par défaut les quatre volets de la maison : PC, salon, porte, cuisine. */
  shutters: { id: string; name: string; shadeId: number; closeSeconds?: number }[]
  /** Les volets qui ont l'action automatique « ouvrir au lever du soleil, fermer à son coucher » (SHUTTERS_AUTO, leurs identifiants séparés par des virgules ; par défaut tous les volets). */
  shuttersAuto: string[]
  /** L'ESP32 (firmware ESPSomfy-RTS) qui envoie les ordres radio ; null : SIMULATION, aucun ordre n'est envoyé (SHUTTERS_ESP_URL). */
  shuttersEspUrl: string | null
  /** Le détecteur Hue qui éteint la prise (option « éteindre au mouvement »), par son nom chez le pont. */
  plugMotionSensor: string
  /** Le détecteur Hue dont la température décide du chauffage automatique (PLUG_TEMPERATURE_SENSOR ; par défaut le détecteur du mouvement). */
  plugTemperatureSensor: string
  /** La position de la maison : le lever et le coucher du soleil (la nuit du chauffage). */
  housePosition: { latitude: number; longitude: number }
  /** L'enregistreur (motion), sur le réseau Docker : le bouton « Enregistrer » de la WebApp lui parle par /record ; null sans RECORDER_URL : /record répond 503. */
  recorderUrl: string | null
  /** Le certificat de la maison ; absent, l'API reste en HTTP (développement). */
  tls: { cert: string; key: string } | null
  /** Le certificat public de l'autorité de la maison, que l'API propose au téléchargement (/rootCA.crt) ; vide : pas de téléchargement. */
  caCert: string
}

const MIN_KEY_LENGTH = 8

/** « 1:Salon,2:Chambre » en volets : le numéro du volet dans le firmware (qui sert aussi d'identifiant) puis son nom. Une entrée mal écrite est ignorée. */
const DEFAULT_SHUTTERS = '1:Volet PC,2:Volet salon,3:Volet porte,4:Volet cuisine'

export const parseShutters = (text: string): { id: string; name: string; shadeId: number; closeSeconds?: number }[] =>
  text
    .split(',')
    .map((part) => /^\s*(\d+)\s*:\s*(.+?)\s*(?::\s*(\d+)\s*)?$/.exec(part))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ id: match[1], name: match[2], shadeId: Number(match[1]), ...(match[3] && Number(match[3]) > 0 ? { closeSeconds: Number(match[3]) } : {}) }))

/** « salon:Salon:192.168.1.130,chambre:Chambre:192.168.1.6 » en unités de climatisation. Une entrée mal écrite est ignorée. */
export const parseAcUnits = (text: string): { id: string; name: string; host: string }[] =>
  text
    .split(',')
    .map((part) => /^\s*([\w-]+)\s*:\s*(.+?)\s*:\s*(\d{1,3}(?:\.\d{1,3}){3})\s*$/.exec(part))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ id: match[1], name: match[2], host: match[3] }))

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
    acUnits: parseAcUnits(env.AC_UNITS ?? ''),
    shutters: parseShutters(env.SHUTTERS ?? DEFAULT_SHUTTERS),
    shuttersAuto: env.SHUTTERS_AUTO
      ? env.SHUTTERS_AUTO.split(',').map((id) => id.trim()).filter(Boolean)
      : parseShutters(env.SHUTTERS ?? DEFAULT_SHUTTERS).map((shutter) => shutter.id),
    shuttersEspUrl: env.SHUTTERS_ESP_URL ? env.SHUTTERS_ESP_URL.replace(/\/+$/, '') : null,
    plugMotionSensor: env.PLUG_MOTION_SENSOR ?? 'motion interieur',
    plugTemperatureSensor: env.PLUG_TEMPERATURE_SENSOR || env.PLUG_MOTION_SENSOR || 'motion interieur',
    housePosition: { latitude: Number(env.HOUSE_LATITUDE ?? 48.52), longitude: Number(env.HOUSE_LONGITUDE ?? 2.64) },
    plug: env.PLUG_HOST ? { host: env.PLUG_HOST, port: Number(env.PLUG_PORT ?? 9999), mac: env.PLUG_MAC ?? '' } : null,
    recorderUrl: env.RECORDER_URL ? env.RECORDER_URL.replace(/\/+$/, '') : null,
    tls: cert && key && existsSync(cert) && existsSync(key) ? { cert, key } : null,
    caCert: env.CA_CERT ?? '',
  }
}
