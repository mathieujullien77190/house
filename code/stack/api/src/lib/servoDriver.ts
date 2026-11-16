// Le pilote des volets à servos (volet salon) : un ESP32 + PCA9685 fait appuyer trois servos MF90 sur les touches d'une télécommande murale Nice (Monter, Descendre, Stop).
// API de l'ESP32 : GET /set?ch=<0-15>&us=<500-2500>&speed=<degrés/s, 0 = vitesse max> rend {"ms": durée du trajet} ; us = 1500 + degrés × 2000 / 180.
// Chaque volet à servos a ses trois ordres (canaux, angles) dans la configuration (servoConfig.ts, clé = numéro du volet). Un ordre = la séquence validée à la main : aller au départ (à la vitesse réglée), attendre ; aller à l'arrivée (appui), attendre ; garder `hold` secondes ; revenir au départ à pleine vitesse, puis relâcher le servo (`/off`, plus d'impulsion : pas de ronronnement ni d'effort sur le bois).
// Le premier /set se fait avant de rendre la main (une erreur remonte, comme pour l'ESP32 Somfy) ; la suite tourne en tâche de fond et un nouvel ordre pour le même volet l'annule.
import type { ServoConfig, ServoOrder } from './servoConfig.ts'
import type { ShutterCommand, ShutterDriver } from './shutterDriver.ts'

const TIMEOUT_MS = 5000
/** La marge ajoutée à la durée du premier trajet, avant l'appui. */
export const START_MARGIN_MS = 200
/** La marge laissée au retour au départ (pleine vitesse) avant de relâcher le servo. */
export const RELEASE_MARGIN_MS = 800

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new Error('annulé'))
    })
  })

/** L'angle signé (degrés) en largeur d'impulsion (µs), bornée à 500..2500. */
export const microseconds = (degrees: number): number => Math.min(2500, Math.max(500, Math.round(1500 + (degrees * 2000) / 180)))

interface Options {
  /** Relit la configuration (à chaque ordre). */
  readConfig: () => Promise<ServoConfig>
  fetcher?: typeof fetch
  /** Attend `ms` millisecondes, ou échoue si `signal` est annulé ; remplaçable dans les essais. */
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
}

export const createServoDriver = ({ readConfig, fetcher = fetch, wait = sleep }: Options): ShutterDriver => {
  // La séquence en cours de chaque volet (numéro du volet) : un nouvel ordre l'annule.
  const runs = new Map<number, AbortController>()

  const move = async (baseUrl: string, order: ServoOrder, degrees: number, speed: number): Promise<number> => {
    const response = await fetcher(`${baseUrl}/set?ch=${order.channel}&us=${microseconds(degrees)}&speed=${speed}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) throw new Error(`ESP32 servos : HTTP ${response.status}`)
    const { ms } = (await response.json().catch(() => ({}))) as { ms?: unknown }
    return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0
  }

  /** Coupe l'impulsion du canal : le servo n'est plus tenu. */
  const release = async (baseUrl: string, order: ServoOrder): Promise<void> => {
    const response = await fetcher(`${baseUrl}/off?ch=${order.channel}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) throw new Error(`ESP32 servos : HTTP ${response.status}`)
  }

  return {
    mock: false,
    send: async (shadeId, command: ShutterCommand) => {
      const config = await readConfig()
      const order = config.shutters[String(shadeId)]?.[command]
      if (!order) throw new Error(`servos : pas de réglage pour le volet ${shadeId}`)
      runs.get(shadeId)?.abort()
      runs.delete(shadeId)
      const run = new AbortController()
      runs.set(shadeId, run)
      let first: number
      try {
        first = await move(config.url, order, order.start, order.speed)
      } catch (error) {
        if (runs.get(shadeId) === run) runs.delete(shadeId)
        throw error
      }
      void (async () => {
        try {
          await wait(first + START_MARGIN_MS, run.signal)
          const press = await move(config.url, order, order.end, order.speed)
          await wait(press, run.signal)
          await wait(order.hold * 1000, run.signal)
          const back = await move(config.url, order, order.start, 0)
          await wait(back + RELEASE_MARGIN_MS, run.signal)
          await release(config.url, order)
        } catch {
          // Annulé par un autre ordre, ou l'ESP32 a cessé de répondre : la suite est abandonnée.
        } finally {
          if (runs.get(shadeId) === run) runs.delete(shadeId)
        }
      })()
    },
  }
}

/**
 * Le pilote des volets de la maison : les volets « servo » (SHUTTERS_SERVO, leurs numéros) vont au pilote des servos, les autres au pilote Somfy. La simulation
 * (`mock`) n'est annoncée que si aucun volet n'est à servos : le pilote des servos, lui, envoie toujours de vrais ordres.
 */
export const createRoutingDriver = (somfy: ShutterDriver, servo: ShutterDriver, servoIds: readonly number[]): ShutterDriver => ({
  mock: somfy.mock && servoIds.length === 0,
  send: (shadeId, command) => (servoIds.includes(shadeId) ? servo : somfy).send(shadeId, command),
})
