// La configuration de House Sync, lue une fois dans l'environnement (variables du compose) : aucun autre fichier ne lit `process.env`,
// sauf les modules de lecture de la machine (specs, réseau, pont Hue) qui ont leur propre réglage.
import { resolve } from 'node:path'
import type { Position } from './sun.ts'

export interface Config {
  /** Les enregistreurs à interroger (un par machine), sans « / » final. */
  recorders: string[]
  /** La clé de la page (la même que l'API). */
  houseKey: string
  pagePort: number
  webDir: string
  tlsCert: string
  tlsKey: string
  dataDir: string
  powerFile: string
  dockerFile: string
  composeFile: string
  apiUrl: string
  apiCaFile: string
  apiServername: string
  intervalMs: number
  snapshotIntervalSeconds: number
  housePosition: Position
  /** Le vent (km/h) à partir duquel le mode vent des caméras s'active (WIND_THRESHOLD_KMH, 20 par défaut). */
  windThresholdKmh: number
  go2rtcUrl: string
  /** CLIP_RETENTION_DAYS tel quel (texte) : sert tant que la page n'a rien réglé. */
  retentionDaysEnv: string | undefined
  guestStateFile: string
  /** La configuration des servos des volets salon, PC et porte (SERVOS_FILE), que House API relit à chaque ordre. */
  servosFile: string
  guestVisitsFile: string
  guestVisitsDays: number
  /** La page invité (guest/) : sa clé, son port et, si elle est ouverte à internet, son adresse publique ; null sans GUEST_KEY. House Sync en donne le lien dans ses réglages. */
  guest: { key: string; port: number; url: string } | null
  /** L'adresse (sans la clé) de la page invité du réseau, servie par House API (`/chezmatou`) : House Sync l'affiche à côté de ses interrupteurs (LAN_PAGE_URL). */
  lanPageUrl: string
  /** Les anciens fichiers de House API (appareils de la maison et invités de la box), repris une seule fois dans la base (BOX_KNOWN_FILE, BOX_GUESTS_FILE). */
  boxKnownFile: string
  boxGuestsFile: string
  /** Les anciens fichiers de House API (data/house), repris une seule fois dans la table house_state (HOUSE_DIR). */
  houseDir: string
  hueAddress: string
  hueKey: string
  /** Les lampes (identifiants du pont) que l'allumage du coucher du soleil allume : le salon, la cuisine et l'entrée de la WebApp (SUNSET_LIGHTS, séparées par des virgules). */
  sunsetLights: string[]
  /** Décalage de l'allumage par rapport au coucher du soleil, en minutes (SUNSET_LIGHTS_OFFSET_MINUTES ; négatif : avant). */
  sunsetOffsetMinutes: number
}

/** La configuration d'un environnement (les valeurs par défaut sont celles du compose de la maison). */
export const loadConfig = (env: NodeJS.ProcessEnv): Config => ({
  // L'enregistreur (conteneur motion) : son API est interne, sans mot de passe, jamais publiée.
  // Les enregistreurs à interroger (un par machine) : RECORDER_URLS, séparés par des virgules ; RECORDER_URL pour un seul.
  recorders: (env.RECORDER_URLS ?? env.RECORDER_URL ?? 'http://motion:8080')
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
  houseKey: env.HOUSE_KEY ?? '',
  pagePort: Number(env.PAGE_PORT ?? 8081),
  webDir: resolve(env.WEB_DIR ?? './web'),
  tlsCert: env.TLS_CERT ?? '',
  tlsKey: env.TLS_KEY ?? '',
  dataDir: env.DATA_DIR ?? './data',
  // La consommation : le fichier écrit sur l'hôte (power/house-power.sh) et House API (le PoE des caméras, même clé).
  powerFile: env.POWER_FILE ?? '/power/cpu.json',
  dockerFile: env.DOCKER_FILE ?? '/power/docker.json',
  composeFile: env.COMPOSE_FILE ?? '/host/docker-compose.yml',
  apiUrl: env.API_URL ?? '',
  apiCaFile: env.API_CA_FILE ?? '',
  apiServername: env.API_SERVERNAME ?? 'localhost',
  intervalMs: Number(env.POLL_INTERVAL_SECONDS ?? 30) * 1000,
  snapshotIntervalSeconds: Number(env.SNAPSHOT_INTERVAL_SECONDS ?? 60),
  // Le soleil se calcule pour la maison (HOUSE_LATITUDE et HOUSE_LONGITUDE ; par défaut la Seine-et-Marne, à quelques minutes près).
  housePosition: { latitude: Number(env.HOUSE_LATITUDE ?? 48.52), longitude: Number(env.HOUSE_LONGITUDE ?? 2.64) },
  windThresholdKmh: Number(env.WIND_THRESHOLD_KMH ?? 20) || 20,
  go2rtcUrl: (env.GO2RTC_URL ?? 'http://go2rtc:1984').replace(/\/$/, ''),
  retentionDaysEnv: env.CLIP_RETENTION_DAYS,
  guestStateFile: env.GUEST_STATE_FILE ?? '/guest/state.json',
  servosFile: env.SERVOS_FILE ?? '/servos/servos.json',
  guestVisitsFile: env.GUEST_VISITS_FILE ?? '/guest-visits/visits.jsonl',
  guestVisitsDays: Number(env.GUEST_VISITS_DAYS ?? 365),
  lanPageUrl: env.LAN_PAGE_URL ?? 'https://chezmatou.local:8080/chezmatou',
  guest: env.GUEST_KEY ? { key: env.GUEST_KEY, port: Number(env.GUEST_PORT ?? 8090), url: env.GUEST_PUBLIC_URL ?? '' } : null,
  boxKnownFile: env.BOX_KNOWN_FILE ?? '/house/box-known.json',
  boxGuestsFile: env.BOX_GUESTS_FILE ?? '/house/box-guests.json',
  houseDir: env.HOUSE_DIR ?? '/house',
  hueAddress: env.HUE_BRIDGE_IP ?? '',
  hueKey: env.HUE_APP_KEY ?? '',
  sunsetLights: (env.SUNSET_LIGHTS ?? '11,16,18,22,13,14,3,5,27')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  sunsetOffsetMinutes: Number(env.SUNSET_LIGHTS_OFFSET_MINUTES ?? 0) || 0,
})
