// Le chauffage automatique de la volière (la prise) : toutes les 60 s, s'il fait froid la nuit et que la prise est éteinte, on l'allume pour quelques
// minutes (le minuteur de la prise l'éteint ensuite : jamais d'allumage sans fin). Chaque activation commandée par notre système est notée dans le journal :
// la règle (`auto`) ou la WebApp (`manuel`, notée par plugService). Un geste sur la prise elle-même n'est pas observé.
import { isNight, type Position } from '../lib/sun.ts'
import { activationCost } from '../lib/heatingCost.ts'
import type { Activation, HeatingLog } from '../lib/heatingLog.ts'
import { mergeSettings, type HeatingSettings, type HeatingSettingsStore } from '../lib/heatingSettings.ts'
import type { PlugService } from './plugService.ts'

/** Ce que plugService appelle à chaque allumage commandé par l'API : la ligne du journal, avec le coût prévu (prix, heures creuses et puissance constants). */
export const createRecorder =
  (log: HeatingLog) =>
  (activation: Activation): void =>
    log.append({ ...activation, cost: activationCost(activation) })

/** Le rythme du tour. */
const TICK_MS = 60_000

/** La température de la volière (°C), ou null si le détecteur ne la donne pas ; lève une erreur si le pont est injoignable. */
export interface TemperatureSource {
  read: () => Promise<number | null>
}

export interface HeatingStatus extends HeatingSettings {
  /** Le début de la dernière activation (secondes), null s'il n'y en a jamais eu. */
  lastActivationAt: number | null
  /** Quand la règle pourra réchauffer au plus tôt (secondes), null sans activation passée. */
  nextAllowedAt: number | null
  temperature: number | null
  night: boolean
  /** Il fait moins que le seuil. */
  cold: boolean
}

interface Options {
  plug: PlugService
  settings: HeatingSettingsStore
  log: HeatingLog
  /** Null sans pont Hue : la règle ne peut pas tourner (il n'y a pas de température). */
  temperature: TemperatureSource | null
  position: Position
  /** Où dire ce qui ne va pas (une fois par panne). */
  warn?: (message: string) => void
}

export const createHeatingService = ({ plug, settings, log, temperature, position, warn = console.warn }: Options) => {
  const readTemperature = async (): Promise<number | null> => {
    if (!temperature) return null
    try {
      return await temperature.read()
    } catch {
      return null
    }
  }

  // Le dernier problème dit dans les logs : redit seulement quand il change.
  let said: string | null = null
  const say = (message: string | null): void => {
    if (message === said) return
    said = message
    if (message) warn(`Chauffage : ${message}`)
  }

  let plugSaid = false
  const tick = async (): Promise<void> => {
    const rule = settings.get()
    if (!rule.enabled || !temperature) return
    let on: boolean
    try {
      on = (await plug.get()).on
    } catch {
      return
    }
    if (on) return
    const nowSeconds = Math.floor(Date.now() / 1000)
    const last = log.lastAt()
    if (last !== null && nowSeconds - last < rule.cooldownMinutes * 60) return
    if (!isNight(nowSeconds, position, 0)) return
    let celsius: number | null
    try {
      celsius = await temperature.read()
    } catch {
      celsius = null
    }
    if (celsius === null) return say('température de la volière inconnue (détecteur ou pont injoignable) : pas de chauffage')
    say(null)
    if (celsius >= rule.thresholdC) return
    try {
      await plug.startTimer(rule.minutes, true, { origin: 'auto', temperature: celsius, note: null })
      plugSaid = false
    } catch {
      if (!plugSaid) warn('Chauffage : la prise ne répond pas : pas de chauffage')
      plugSaid = true
    }
  }
  let ticking = false
  setInterval(() => {
    if (ticking) return
    ticking = true
    void tick().finally(() => (ticking = false))
  }, TICK_MS).unref()

  return {
    tick,
    /** La règle peut-elle tourner ? (faux sans pont Hue : pas de température) */
    canRule: temperature !== null,
    settings: (): HeatingSettings => settings.get(),
    /** Change les réglages (une valeur absente garde l'ancienne) ; rend les nouveaux, ou le texte de l'erreur. */
    update: (body: unknown): HeatingSettings | string => {
      const merged = mergeSettings(body, settings.get())
      if (typeof merged !== 'string') settings.set(merged)
      return merged
    },
    /** Les réglages et ce qu'il en est maintenant : dernière activation, température, nuit ou jour, froid ou non. */
    status: async (): Promise<HeatingStatus> => {
      const rule = settings.get()
      const celsius = await readTemperature()
      const last = log.lastAt()
      return {
        ...rule,
        lastActivationAt: last,
        nextAllowedAt: last === null ? null : last + rule.cooldownMinutes * 60,
        temperature: celsius,
        night: isNight(Math.floor(Date.now() / 1000), position, 0),
        cold: celsius !== null && celsius < rule.thresholdC,
      }
    },
    /** Les dernières activations, la plus récente d'abord. */
    log: (limit: number) => log.recent(limit),
  }
}

export type HeatingService = ReturnType<typeof createHeatingService>
