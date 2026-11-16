// La configuration des servos des volets (bloc « Volets à servos » des réglages) : un fichier JSON que House Sync écrit et que House API relit en lecture seule
// à chaque ordre (le même principe que guestState.ts). Forme : {"url", "shutters": {"<numéro du volet>": {"up", "down", "stop"}}}. Ancienne forme encore lue :
// {"url", "up", "down", "stop"} = le volet salon seul. Sans fichier, les valeurs par défaut ci-dessous.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Un ordre : canal du PCA9685 (0 à 15), angles de départ et d'arrivée (degrés, de −90 à 90), vitesse (degrés par seconde, 0 = la plus rapide), attente (secondes). */
export interface ServoOrder {
  channel: number
  start: number
  end: number
  speed: number
  hold: number
}

export interface ServoShutter {
  up: ServoOrder
  down: ServoOrder
  stop: ServoOrder
}

export interface ServoConfig {
  url: string
  shutters: Record<string, ServoShutter>
}

export const SERVO_COMMANDS = ['up', 'down', 'stop'] as const

const idle = (channel: number): ServoOrder => ({ channel, start: 0, end: 0, speed: 10, hold: 0.5 })

/** Les volets à servos (leur numéro dans SHUTTERS) et leurs réglages par défaut : le salon (validé à la main), le PC et la porte (angles à 0 : rien ne bouge tant qu'ils ne sont pas saisis). */
export const DEFAULT_SERVOS: ServoConfig = {
  url: 'http://192.168.1.115',
  shutters: {
    '2': {
      down: { channel: 0, start: -42, end: -50, speed: 10, hold: 0.5 },
      up: { channel: 1, start: 41, end: 50, speed: 10, hold: 0.5 },
      stop: { channel: 2, start: -42, end: -50, speed: 10, hold: 0.5 },
    },
    '5': { down: idle(3), up: idle(4), stop: idle(5) },
    '6': { down: idle(6), up: idle(7), stop: idle(8) },
  },
}

const SHUTTER_IDS = Object.keys(DEFAULT_SERVOS.shutters)

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const bounded = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null

const parseOrder = (raw: unknown): ServoOrder | null => {
  if (!isRecord(raw)) return null
  const channel = bounded(raw.channel, 0, 15)
  const start = bounded(raw.start, -90, 90)
  const end = bounded(raw.end, -90, 90)
  const speed = bounded(raw.speed, 0, Number.MAX_SAFE_INTEGER)
  const hold = bounded(raw.hold, 0, Number.MAX_SAFE_INTEGER)
  if (channel === null || !Number.isInteger(channel) || start === null || end === null || speed === null || hold === null) return null
  return { channel, start, end, speed, hold }
}

/** Valide une configuration complète (adresse http, les trois volets, chacun ses trois ordres : nombres finis, canal entier de 0 à 15, angles de −90 à 90, vitesse et attente d'au moins 0) ; null si elle est fausse. */
export const parseServos = (value: unknown): ServoConfig | null => {
  if (!isRecord(value) || typeof value.url !== 'string' || !/^https?:\/\/[^\s/]+\S*$/.test(value.url.trim()) || !isRecord(value.shutters)) return null
  const shutters: Record<string, ServoShutter> = {}
  for (const id of SHUTTER_IDS) {
    const raw = value.shutters[id]
    if (!isRecord(raw)) return null
    const up = parseOrder(raw.up)
    const down = parseOrder(raw.down)
    const stop = parseOrder(raw.stop)
    if (!up || !down || !stop) return null
    shutters[id] = { up, down, stop }
  }
  return { url: value.url.trim().replace(/\/+$/, ''), shutters }
}

/** Ajoute `patch` (l'adresse et/ou, par volet, des champs de certains ordres) à la configuration `current` ; null si le corps n'est pas un objet, nomme un volet inconnu ou si le résultat est faux. */
export const mergeServos = (current: ServoConfig, patch: unknown): ServoConfig | null => {
  if (!isRecord(patch)) return null
  const patched = patch.shutters ?? {}
  if (!isRecord(patched) || Object.keys(patched).some((id) => !SHUTTER_IDS.includes(id))) return null
  const shutters: Record<string, unknown> = {}
  for (const id of SHUTTER_IDS) {
    const part = patched[id]
    if (part !== undefined && !isRecord(part)) return null
    const orders: Record<string, unknown> = {}
    for (const command of SERVO_COMMANDS) {
      const fields = part?.[command]
      if (fields !== undefined && !isRecord(fields)) return null
      orders[command] = { ...current.shutters[id][command], ...(fields ?? {}) }
    }
    shutters[id] = orders
  }
  return parseServos({ url: patch.url ?? current.url, shutters })
}

/** Complète un fichier lu : forme actuelle ou ancienne (salon seul), volets manquants aux valeurs par défaut ; null si une valeur est fausse. */
const normalize = (raw: unknown): ServoConfig | null => {
  if (!isRecord(raw)) return null
  const saved = isRecord(raw.shutters) ? raw.shutters : raw.shutters === undefined ? { '2': { up: raw.up, down: raw.down, stop: raw.stop } } : null
  if (saved === null) return null
  const shutters: Record<string, unknown> = {}
  for (const id of SHUTTER_IDS) shutters[id] = saved[id] ?? DEFAULT_SERVOS.shutters[id]
  return parseServos({ url: raw.url ?? DEFAULT_SERVOS.url, shutters })
}

/** Lit la configuration ; fichier absent ou faux : les valeurs par défaut. */
export const readServos = async (file: string): Promise<ServoConfig> => {
  try {
    return normalize(JSON.parse(await readFile(file, 'utf8'))) ?? DEFAULT_SERVOS
  } catch {
    return DEFAULT_SERVOS
  }
}

/** Écrit la configuration (fichier temporaire puis renommage : l'API ne lit jamais un fichier à moitié écrit). */
export const writeServos = async (file: string, config: ServoConfig): Promise<void> => {
  await mkdir(dirname(file), { recursive: true })
  const partial = `${file}.tmp`
  await writeFile(partial, JSON.stringify(config))
  await rename(partial, file)
}
