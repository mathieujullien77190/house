// Les volets roulants : la liste (SHUTTERS dans le .env) et les ordres Monter / Descendre / Stop. Le Somfy RTS est à sens unique : on ne sait ni
// où est un volet ni s'il a bougé, seulement le DERNIER ORDRE envoyé et quand (relu du journal au démarrage, pour qu'un redémarrage ne l'oublie pas).
import type { ShutterDriver, ShutterCommand } from '../lib/shutterDriver.ts'
import type { ShutterLog } from '../lib/shutterLog.ts'

/** Un volet de la maison : son identifiant (dans l'URL), son nom affiché et son numéro dans le firmware de l'ESP32. */
export interface ShutterConfig {
  id: string
  name: string
  shadeId: number
  /** Le temps (secondes) que le volet met à se fermer en entier : sans lui, pas de « Fermer à moitié ». */
  closeSeconds?: number
}

export interface ShutterInfo {
  id: string
  name: string
  /** Le dernier ordre envoyé, null s'il n'y en a jamais eu. */
  lastCommand: ShutterCommand | null
  /** Quand (secondes depuis 1970), null s'il n'y en a jamais eu. */
  lastAt: number | null
  /** Le temps de fermeture complète (secondes), ou null : le volet n'a pas de « Fermer à moitié ». */
  closeSeconds: number | null
  /** « Fermer à moitié » est en cours (le volet s'ouvre à fond, puis se ferme à moitié). */
  halfRunning: boolean
}

export interface ShuttersState {
  /** La simulation : aucun ordre radio n'est envoyé (SHUTTERS_ESP_URL absent). */
  mock: boolean
  shutters: ShutterInfo[]
}

interface Options {
  shutters: ShutterConfig[]
  driver: ShutterDriver
  log: ShutterLog
  /** Les secondes depuis 1970 (injectée pour les essais). */
  now?: () => number
  /** Attend `ms` millisecondes, ou rend la main (en échouant) si `signal` est annulé ; `setTimeout` par défaut, remplaçable dans les essais. */
  wait?: (ms: number, signal: AbortSignal) => Promise<void>
}

/** Un volet inconnu : la route répond 404. */
export class UnknownShutter extends Error {}
/** Un volet sans temps de fermeture : « Fermer à moitié » n'existe pas pour lui (409). */
export class NoCloseTime extends Error {}

/** « Fermer à moitié » : le volet s'ouvre à fond (le temps de fermeture plus cette marge, pour être sûr qu'il est en haut), puis se ferme pendant la moitié du temps de fermeture. */
export const OPEN_MARGIN_SECONDS = 6

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new Error('annulé'))
    })
  })

export const createShuttersService = ({ shutters, driver, log, now = () => Math.floor(Date.now() / 1000), wait = sleep }: Options) => {
  // Le dernier ordre de chaque volet : relu du journal (le plus récent d'abord), puis tenu à jour.
  const last = new Map<string, { command: ShutterCommand; at: number }>()
  for (const entry of log.recent(shutters.length * 50 + 50)) {
    if (entry.ok && !last.has(entry.shutter)) last.set(entry.shutter, { command: entry.command, at: entry.at })
  }

  // Les « Fermer à moitié » en cours, un par volet : tout autre ordre donné à ce volet les annule (le Stop de l'utilisateur arrête la suite).
  const runs = new Map<string, AbortController>()

  const info = (shutter: ShutterConfig): ShutterInfo => ({
    id: shutter.id,
    name: shutter.name,
    lastCommand: last.get(shutter.id)?.command ?? null,
    lastAt: last.get(shutter.id)?.at ?? null,
    closeSeconds: shutter.closeSeconds ?? null,
    halfRunning: runs.has(shutter.id),
  })

  /** Envoie un ordre, le note au journal (réussi ou non). Lève l'erreur du pilote. */
  const deliver = async (shutter: ShutterConfig, command: ShutterCommand, note: string | null): Promise<void> => {
    const at = now()
    try {
      await driver.send(shutter.shadeId, command)
    } catch (error) {
      log.append({ at, shutter: shutter.id, name: shutter.name, command, ok: false, note: [note, error instanceof Error ? error.message : String(error)].filter(Boolean).join(' · ') })
      throw error
    }
    log.append({ at, shutter: shutter.id, name: shutter.name, command, ok: true, note: [note, driver.mock ? 'simulation' : null].filter(Boolean).join(' · ') || null })
    last.set(shutter.id, { command, at })
  }

  const find = (id: string): ShutterConfig => {
    const shutter = shutters.find((candidate) => candidate.id === id)
    if (!shutter) throw new UnknownShutter(id)
    return shutter
  }

  const cancel = (id: string): void => {
    runs.get(id)?.abort()
    runs.delete(id)
  }

  return {
    /** Les volets et leur dernier ordre. */
    state: (): ShuttersState => ({ mock: driver.mock, shutters: shutters.map(info) }),
    /** Envoie un ordre à un volet (`note` : pourquoi, par exemple l'action automatique), le note au journal (réussi ou non) et rend le volet à jour. Annule un « Fermer à moitié » en cours. Lève UnknownShutter, ou l'erreur du pilote. */
    command: async (id: string, command: ShutterCommand, note: string | null = null): Promise<ShutterInfo> => {
      const shutter = find(id)
      cancel(id)
      await deliver(shutter, command, note)
      return info(shutter)
    },
    /**
     * « Fermer à moitié » : monter, attendre que le volet soit tout en haut (le temps de fermeture plus `OPEN_MARGIN_SECONDS`), descendre pendant la moitié du temps de fermeture, puis
     * stop. Le premier ordre part avant la réponse (une erreur du pilote est rendue) ; la suite se déroule en tâche de fond, et tout autre ordre au même volet l'annule. Le Somfy RTS
     * étant à sens unique, c'est le temps qui fait le « à moitié » : si l'API redémarre en route, le volet finit sa course. Lève UnknownShutter, NoCloseTime ou l'erreur du pilote.
     */
    closeHalf: async (id: string): Promise<ShutterInfo> => {
      const shutter = find(id)
      const closeSeconds = shutter.closeSeconds
      if (!closeSeconds) throw new NoCloseTime(id)
      cancel(id)
      const run = new AbortController()
      runs.set(id, run)
      try {
        await deliver(shutter, 'up', 'à moitié : ouvrir à fond')
      } catch (error) {
        runs.delete(id)
        throw error
      }
      void (async () => {
        try {
          await wait((closeSeconds + OPEN_MARGIN_SECONDS) * 1000, run.signal)
          await deliver(shutter, 'down', 'à moitié : fermer')
          await wait(Math.floor(closeSeconds / 2) * 1000, run.signal)
          await deliver(shutter, 'stop', 'à moitié : arrêt')
        } catch {
          // Annulé par un autre ordre, ou le pilote a échoué (déjà noté au journal) : la suite est abandonnée.
        } finally {
          if (runs.get(id) === run) runs.delete(id)
        }
      })()
      return info(shutter)
    },
  }
}

export type ShuttersService = ReturnType<typeof createShuttersService>
