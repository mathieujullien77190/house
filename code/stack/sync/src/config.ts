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
  snapshotRetentionDays: number
  housePosition: Position
  zonesFile: string
  go2rtcUrl: string
  savedClipsFile: string
  /** CLIP_RETENTION_DAYS tel quel (texte) : sert tant que la page n'a rien réglé. */
  retentionDaysEnv: string | undefined
  guestStateFile: string
  guestVisitsFile: string
  guestVisitsDays: number
  /** Le journal des activations du chauffage, écrit par House API (HEATING_LOG_FILE). */
  heatingLogFile: string
  /** Le journal des ordres aux volets roulants, écrit par House API (SHUTTER_LOG_FILE). */
  shutterLogFile: string
  planFile: string
  hueAddress: string
  hueKey: string
  hueLogDays: number
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
  snapshotRetentionDays: Number(env.SNAPSHOT_RETENTION_DAYS ?? 7),
  // Le soleil se calcule pour la maison (HOUSE_LATITUDE et HOUSE_LONGITUDE ; par défaut la Seine-et-Marne, à quelques minutes près).
  housePosition: { latitude: Number(env.HOUSE_LATITUDE ?? 48.52), longitude: Number(env.HOUSE_LONGITUDE ?? 2.64) },
  zonesFile: env.ZONES_FILE ?? '/house/zones.json',
  go2rtcUrl: (env.GO2RTC_URL ?? 'http://go2rtc:1984').replace(/\/$/, ''),
  savedClipsFile: env.SAVED_CLIPS_FILE ?? '/house/saved-clips.json',
  retentionDaysEnv: env.CLIP_RETENTION_DAYS,
  guestStateFile: env.GUEST_STATE_FILE ?? '/guest/state.json',
  guestVisitsFile: env.GUEST_VISITS_FILE ?? '/guest-visits/visits.jsonl',
  guestVisitsDays: Number(env.GUEST_VISITS_DAYS ?? 365),
  heatingLogFile: env.HEATING_LOG_FILE ?? '/house/heating-log.jsonl',
  shutterLogFile: env.SHUTTER_LOG_FILE ?? '/house/shutters-log.jsonl',
  planFile: env.PLAN_FILE ?? '/house/plan.json',
  hueAddress: env.HUE_BRIDGE_IP ?? '',
  hueKey: env.HUE_APP_KEY ?? '',
  hueLogDays: Number(env.HUE_LOG_DAYS ?? 365),
})
