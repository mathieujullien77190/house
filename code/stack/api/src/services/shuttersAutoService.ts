// L'action automatique des volets : ouvrir au lever du soleil et/ou fermer à son coucher (deux options séparées), pour les volets listés (SHUTTERS_AUTO), activées une par une.
// Toutes les minutes, on cherche le lever et le coucher qui sont passés depuis le dernier passage et on envoie l'ordre (« up » au lever, « down » au coucher).
// Un lever manqué (l'API était arrêtée) est encore joué s'il date de moins de deux heures ; au-delà, on le laisse : un volet qui s'ouvre en plein après-midi
// surprendrait. Activer la règle après un lever ne l'ouvre pas : elle attend le prochain. Le soleil est calculé pour la position de la maison (`lib/sun.ts`).
import { sunTimes, type Position } from '../lib/sun.ts'
import type { ShutterCommand } from '../lib/shutterDriver.ts'
import type { ShutterAutoStore } from '../lib/shutterAutoStore.ts'
import type { ShuttersService } from './shuttersService.ts'

/** Un lever ou un coucher joué plus de deux heures après son heure est ignoré. */
export const MAX_LATE_SECONDS = 7200
/** Le rythme du tour. */
const TICK_MS = 60_000
const DAY = 86400

/** Le lever et le coucher qui tombent dans ]depuis, jusqu'à], les plus anciens d'abord, avec l'ordre à envoyer. */
export const crossedEvents = (since: number, until: number, position: Position): { at: number; command: ShutterCommand; note: string }[] => {
  const events: { at: number; command: ShutterCommand; note: string }[] = []
  for (let day = Math.floor(since / DAY) - 1; day <= Math.floor(until / DAY); day += 1) {
    const times = sunTimes(day * DAY, position)
    if (!times) continue
    events.push({ at: times.rise, command: 'up', note: 'auto : lever du soleil' }, { at: times.set, command: 'down', note: 'auto : coucher du soleil' })
  }
  return events.filter((event) => event.at > since && event.at <= until).sort((a, b) => a.at - b.at)
}

interface Options {
  /** Les identifiants des volets qui ont l'action automatique (les autres n'ont pas la case). */
  ids: string[]
  shutters: ShuttersService
  store: ShutterAutoStore
  position: Position
  /** Les secondes depuis 1970 (injectée pour les essais). */
  now?: () => number
}

export const createShuttersAuto = ({ ids, shutters, store, position, now = () => Math.floor(Date.now() / 1000) }: Options) => {
  const tick = async (): Promise<void> => {
    const until = now()
    const states = store.get()
    for (const id of ids) {
      const state = states[id]
      if (!state || (!state.open && !state.close)) continue
      // Les plus anciens d'abord. `since` avance à chaque ordre joué ou sauté (trop vieux) ; s'il échoue, on s'arrête là et on réessaie au prochain tour.
      let since = state.since
      let failed = false
      for (const event of crossedEvents(since, until, position)) {
        // Un ordre dont l'option est coupée est sauté, mais compté comme traité.
        const wanted = event.command === 'up' ? state.open : state.close
        if (wanted && until - event.at <= MAX_LATE_SECONDS) {
          try {
            await shutters.command(id, event.command, event.note)
          } catch {
            failed = true
            break
          }
        }
        since = event.at
      }
      if (!failed) since = until
      if (since !== state.since) store.set({ ...store.get(), [id]: { ...state, since } })
    }
  }
  setInterval(() => void tick(), TICK_MS).unref()

  return {
    tick,
    /** Les volets qui ont l'action automatique, avec leurs deux options (ouvrir au lever, fermer au coucher). */
    state: (): Record<string, { open: boolean; close: boolean }> => {
      const states = store.get()
      return Object.fromEntries(ids.map((id) => [id, { open: states[id]?.open === true, close: states[id]?.close === true }]))
    },
    /** Les identifiants qui ont l'action automatique. */
    ids,
    /** Change les options d'un volet (une option absente garde sa valeur) ; faux si le volet n'a pas d'action automatique. Activer ne rejoue pas un lever déjà passé. */
    setOptions: (id: string, patch: { open?: boolean; close?: boolean }): boolean => {
      if (!ids.includes(id)) return false
      const current = store.get()[id] ?? { open: false, close: false, since: 0 }
      store.set({ ...store.get(), [id]: { open: patch.open ?? current.open, close: patch.close ?? current.close, since: now() } })
      return true
    },
  }
}

export type ShuttersAuto = ReturnType<typeof createShuttersAuto>
