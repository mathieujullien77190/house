// La configuration de la page invité, lue une fois dans l'environnement et validée au démarrage.
import { existsSync } from 'node:fs'

export interface Config {
  port: number
  /** La clé du lien invité : sans elle (ou trop courte), le service ne démarre pas. */
  key: string
  /** Les caméras montrées, dans l'ordre de la page. */
  cameras: string[]
  /** go2rtc, sur le réseau Docker (jamais publié). */
  go2rtcUrl: string
  /** Le nombre de personnes qui regardent en même temps au plus (chacune ouvre un flux par caméra). */
  maxViewers: number
  /** Un flux se coupe après ce nombre de minutes (la page se recharge juste avant). */
  maxMinutes: number
  /** Le fichier d'état écrit par House Sync (bouton « Coupée »), relu en lecture seule ; vide : toujours joignable. */
  stateFile: string
  /** Le journal des visites que House Sync importe ; vide : pas de journal. */
  visitsFile: string
  /** Le certificat HTTPS ; absent, le service reste en HTTP (développement). */
  tls: { cert: string; key: string } | null
}

export const MIN_KEY_LENGTH = 16
const CAMERA = /^[\w-]+$/

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const key = env.GUEST_KEY ?? ''
  if (key.length < MIN_KEY_LENGTH) {
    throw new Error(`GUEST_KEY absente ou trop courte (${MIN_KEY_LENGTH} caractères au moins) : la page invité ne démarre pas.`)
  }
  const cameras = (env.GUEST_CAMERAS ?? 'voliere-exterieur,voliere-interieur')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => CAMERA.test(name))
  if (cameras.length === 0) throw new Error('GUEST_CAMERAS ne contient aucune caméra valide.')
  const cert = env.TLS_CERT ?? ''
  const tlsKey = env.TLS_KEY ?? ''
  return {
    port: Number(env.PORT ?? 8090),
    key,
    cameras,
    go2rtcUrl: (env.GO2RTC_URL ?? 'http://go2rtc:1984').replace(/\/$/, ''),
    maxViewers: Math.max(1, Number(env.GUEST_MAX_VIEWERS ?? 5)),
    maxMinutes: Math.max(1, Number(env.GUEST_MAX_MINUTES ?? 30)),
    stateFile: env.GUEST_STATE_FILE ?? '',
    visitsFile: env.GUEST_VISITS_FILE ?? '',
    tls: cert && tlsKey && existsSync(cert) && existsSync(tlsKey) ? { cert, key: tlsKey } : null,
  }
}
