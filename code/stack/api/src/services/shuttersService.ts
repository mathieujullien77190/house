// Les volets roulants : la liste (SHUTTERS dans le .env) et les ordres Monter / Descendre / Stop. Le Somfy RTS est à sens unique : on ne sait ni
// où est un volet ni s'il a bougé, seulement le DERNIER ORDRE envoyé et quand (relu du journal au démarrage, pour qu'un redémarrage ne l'oublie pas).
import type { ShutterDriver, ShutterCommand } from '../lib/shutterDriver.ts'
import type { ShutterLog } from '../lib/shutterLog.ts'

/** Un volet de la maison : son identifiant (dans l'URL), son nom affiché et son numéro dans le firmware de l'ESP32. */
export interface ShutterConfig {
  id: string
  name: string
  shadeId: number
}

export interface ShutterInfo {
  id: string
  name: string
  /** Le dernier ordre envoyé, null s'il n'y en a jamais eu. */
  lastCommand: ShutterCommand | null
  /** Quand (secondes depuis 1970), null s'il n'y en a jamais eu. */
  lastAt: number | null
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
}

/** Un volet inconnu : la route répond 404. */
export class UnknownShutter extends Error {}

export const createShuttersService = ({ shutters, driver, log, now = () => Math.floor(Date.now() / 1000) }: Options) => {
  // Le dernier ordre de chaque volet : relu du journal (le plus récent d'abord), puis tenu à jour.
  const last = new Map<string, { command: ShutterCommand; at: number }>()
  for (const entry of log.recent(shutters.length * 50 + 50)) {
    if (entry.ok && !last.has(entry.shutter)) last.set(entry.shutter, { command: entry.command, at: entry.at })
  }

  const info = (shutter: ShutterConfig): ShutterInfo => ({
    id: shutter.id,
    name: shutter.name,
    lastCommand: last.get(shutter.id)?.command ?? null,
    lastAt: last.get(shutter.id)?.at ?? null,
  })

  return {
    /** Les volets et leur dernier ordre. */
    state: (): ShuttersState => ({ mock: driver.mock, shutters: shutters.map(info) }),
    /** Envoie un ordre à un volet (`note` : pourquoi, par exemple l'action automatique), le note au journal (réussi ou non) et rend le volet à jour. Lève UnknownShutter, ou l'erreur du pilote. */
    command: async (id: string, command: ShutterCommand, note: string | null = null): Promise<ShutterInfo> => {
      const shutter = shutters.find((candidate) => candidate.id === id)
      if (!shutter) throw new UnknownShutter(id)
      const at = now()
      try {
        await driver.send(shutter.shadeId, command)
      } catch (error) {
        log.append({ at, shutter: shutter.id, name: shutter.name, command, ok: false, note: [note, error instanceof Error ? error.message : String(error)].filter(Boolean).join(' · ') })
        throw error
      }
      log.append({ at, shutter: shutter.id, name: shutter.name, command, ok: true, note: [note, driver.mock ? 'simulation' : null].filter(Boolean).join(' · ') || null })
      last.set(shutter.id, { command, at })
      return info(shutter)
    },
  }
}

export type ShuttersService = ReturnType<typeof createShuttersService>
