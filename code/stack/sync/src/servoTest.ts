// Le bouton « Tester » des réglages des volets à servos : joue la séquence d'un ordre directement vers l'ESP32 des servos, avec les réglages enregistrés. C'est la même séquence
// que le pilote de House API (api/src/lib/servoDriver.ts, copie assumée : changer les deux) : aller au départ (vitesse réglée), attendre ; aller à l'arrivée, attendre ;
// garder `hold` secondes ; revenir au départ à pleine vitesse, puis relâcher le servo (`/off`). Le bouton « Origine » met seulement le servo à 0°. Le premier /set est attendu (une erreur remonte) ; la suite tourne en tâche de fond.
import type { Fetch } from './context.ts'
import type { ServoOrder } from './servos.ts'

const TIMEOUT_MS = 5000
const START_MARGIN_MS = 200
/** La marge laissée au retour au départ (pleine vitesse) avant de relâcher le servo. */
const RELEASE_MARGIN_MS = 800

/** L'angle signé (degrés) en largeur d'impulsion (µs), bornée à 500..2500. */
export const microseconds = (degrees: number): number => Math.min(2500, Math.max(500, Math.round(1500 + (degrees * 2000) / 180)))

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new Error('annulé'))
    })
  })

interface Options {
  fetch: Fetch
  /** Attend `ms` millisecondes, ou échoue si `signal` est annulé ; remplaçable dans les essais. */
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
}

export const createServoTester = ({ fetch, wait = sleep }: Options) => {
  // La séquence en cours de chaque canal : un nouveau test sur le même canal l'annule.
  const runs = new Map<number, AbortController>()

  const move = async (url: string, order: ServoOrder, degrees: number, speed: number): Promise<number> => {
    const response = await fetch(`${url}/set?ch=${order.channel}&us=${microseconds(degrees)}&speed=${speed}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) throw new Error(`ESP32 servos : HTTP ${response.status}`)
    const { ms } = (await response.json().catch(() => ({}))) as { ms?: unknown }
    return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0
  }

  /** Coupe l'impulsion du canal : le servo n'est plus tenu. */
  const release = async (url: string, order: ServoOrder): Promise<void> => {
    const response = await fetch(`${url}/off?ch=${order.channel}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) throw new Error(`ESP32 servos : HTTP ${response.status}`)
  }

  /** Lance la séquence de `order` vers l'ESP32 `url` ; rend la main après le premier /set réussi, ou lève l'erreur (ESP32 muette, refus). `origin` : seulement mettre le servo à 0° (vitesse réglée), sans séquence. */
  return async (url: string, order: ServoOrder, origin = false): Promise<void> => {
    runs.get(order.channel)?.abort()
    if (origin) {
      runs.delete(order.channel)
      await move(url, order, 0, order.speed)
      return
    }
    const run = new AbortController()
    runs.set(order.channel, run)
    let first: number
    try {
      first = await move(url, order, order.start, order.speed)
    } catch (error) {
      if (runs.get(order.channel) === run) runs.delete(order.channel)
      throw error
    }
    void (async () => {
      try {
        await wait(first + START_MARGIN_MS, run.signal)
        const press = await move(url, order, order.end, order.speed)
        await wait(press, run.signal)
        await wait(order.hold * 1000, run.signal)
        const back = await move(url, order, order.start, 0)
        await wait(back + RELEASE_MARGIN_MS, run.signal)
        await release(url, order)
      } catch {
        // Annulé par un autre test, ou l'ESP32 a cessé de répondre : la suite est abandonnée.
      } finally {
        if (runs.get(order.channel) === run) runs.delete(order.channel)
      }
    })()
  }
}
