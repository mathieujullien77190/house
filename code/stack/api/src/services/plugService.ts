// La prise connectée : son état (allumée ou non, signal WiFi) et son changement. Un état lu est gardé 2 s.
// Option « éteindre au mouvement » : tant qu'elle est armée, un détecteur de mouvement Hue (par défaut « motion interieur ») qui voit quelqu'un
// éteint la prise ; l'option s'efface alors, et dès que la prise est éteinte autrement. Quand la prise avait été allumée par la règle automatique du
// chauffage (elle arme toujours l'option), le mouvement désactive aussi la règle (`onAutoCut`).
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Activation } from '../lib/heatingLog.ts'
import type { KasaClient, PlugInfo } from '../lib/kasaClient.ts'

export type PlugState = PlugInfo & {
  /** L'option « éteindre si le détecteur voit un mouvement » est armée. */
  offOnMotion: boolean
}

const CACHE_MS = 2000
/** Le rythme de lecture du détecteur tant que l'option est armée. */
const WATCH_MS = 3000

/** Ce que le garde sait d'un détecteur : son nom et s'il voit un mouvement en ce moment. */
export interface MotionSource {
  presence: () => Promise<boolean | null>
}

interface GuardOptions {
  motion: MotionSource | null
  /** Le fichier où l'option armée est gardée (pour qu'un redémarrage ne l'oublie pas). */
  file: string
  /** Appelée à chaque allumage commandé par l'API (le journal du chauffage). */
  record?: (entry: Activation) => void
  /** Appelée quand un mouvement éteint un chauffage allumé par la règle automatique : la règle se désactive. */
  onAutoCut?: () => void
}

/** D'où vient un allumage commandé par l'API : une commande de la WebApp (par défaut) ou la règle automatique, avec la température qui l'a décidée. */
export interface ActivationMeta {
  origin: 'manuel' | 'auto'
  temperature: number | null
  note: string | null
}
const MANUAL: ActivationMeta = { origin: 'manuel', temperature: null, note: null }

export const createPlugService = (client: KasaClient, guard: GuardOptions = { motion: null, file: '' }) => {
  let cached: { at: number; state: PlugInfo } | null = null
  const read = async (): Promise<PlugInfo> => {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.state
    const state = await client.info()
    cached = { at: Date.now(), state }
    return state
  }

  const load = (): { armed: boolean; origin: ActivationMeta['origin'] } => {
    if (!guard.file) return { armed: false, origin: 'manuel' }
    try {
      const saved = JSON.parse(readFileSync(guard.file, 'utf8')) as { offOnMotion?: unknown; origin?: unknown }
      return { armed: saved.offOnMotion === true, origin: saved.origin === 'auto' ? 'auto' : 'manuel' }
    } catch {
      return { armed: false, origin: 'manuel' }
    }
  }
  const saved = load()
  let armed = saved.armed
  // Qui a allumé la prise sous garde : si c'est la règle automatique, un mouvement la désactive aussi.
  let armedOrigin = saved.origin
  const arm = (value: boolean, origin: ActivationMeta['origin'] = 'manuel'): void => {
    if (armed === value && armedOrigin === origin) return
    armed = value
    armedOrigin = origin
    if (!guard.file) return
    try {
      mkdirSync(dirname(guard.file), { recursive: true })
      const partial = `${guard.file}.tmp`
      writeFileSync(partial, JSON.stringify({ offOnMotion: value, origin }))
      renameSync(partial, guard.file)
    } catch {
      // l'option marche quand même en mémoire
    }
  }

  // La surveillance : un front montant du détecteur (rien, puis un mouvement) éteint la prise. Un mouvement déjà en cours à l'armement ne compte pas.
  let previous: boolean | null = null
  let watching = false
  const watch = async (): Promise<void> => {
    if (!armed || !guard.motion || watching) return
    watching = true
    try {
      const info = await read()
      if (!info.on) {
        arm(false)
        previous = null
        return
      }
      const presence = await guard.motion.presence()
      if (presence === true && previous === false) {
        const byRule = armedOrigin === 'auto'
        await client.set(false)
        cached = null
        arm(false)
        previous = null
        if (byRule) guard.onAutoCut?.()
        return
      }
      if (presence !== null) previous = presence
    } catch {
      // prise ou pont injoignables : on réessaie au prochain tour
    } finally {
      watching = false
    }
  }
  if (guard.motion) setInterval(() => void watch(), WATCH_MS).unref()

  const withOption = (state: PlugInfo): PlugState => ({ ...state, offOnMotion: armed })
  // Une nouvelle commande décide de l'option : armée seulement si elle l'est demandée en allumant.
  const decide = (on: boolean, offOnMotion: boolean, origin: ActivationMeta['origin'] = 'manuel'): void => {
    previous = null
    arm(on && offOnMotion && guard.motion !== null, origin)
  }

  // Chaque allumage pour une durée commandé par l'API va au journal du chauffage.
  const record = (minutes: number, meta: ActivationMeta): void =>
    guard.record?.({ at: Math.floor(Date.now() / 1000), origin: meta.origin, minutes, temperature: meta.temperature, note: meta.note })

  return {
    get: async (): Promise<PlugState> => withOption(await read()),
    /** Les détecteurs permettent-ils l'option ? (faux sans pont Hue) */
    canWatchMotion: guard.motion !== null,
    /** Allume ou éteint la prise, puis rend son état à jour. */
    set: async (on: boolean, offOnMotion = false): Promise<PlugState> => {
      await client.set(on)
      cached = null
      decide(on, offOnMotion)
      return withOption(await read())
    },
    /** Allume la prise pendant `minutes` minutes : c'est la prise qui s'éteint ensuite. */
    startTimer: async (minutes: number, offOnMotion = false, meta: ActivationMeta = MANUAL): Promise<PlugState> => {
      await client.startTimer(minutes * 60)
      cached = null
      decide(true, offOnMotion, meta.origin)
      record(minutes, meta)
      return withOption(await read())
    },
  }
}

export type PlugService = ReturnType<typeof createPlugService>
