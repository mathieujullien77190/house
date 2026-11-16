// La configuration des servos des volets : un fichier JSON (servos.json) que House Sync écrit (bloc « Volets à servos » de ses réglages) et que l'API relit
// en lecture seule à chaque ordre. Chaque ordre (Monter, Descendre, Stop) d'un volet appuie sur une touche de sa télécommande murale Nice par un servo MF90 du PCA9685.
// Forme : {"url": "...", "shutters": {"2": {"up": {...}, "down": {...}, "stop": {...}}, "5": {...}, "6": {...}}} (clé = numéro du volet). Ancienne forme encore lue :
// {"url", "up", "down", "stop"} = le volet salon seul. Sans fichier, ou avec un champ absent ou faux, les valeurs par défaut ci-dessous servent.
import { readFile } from 'node:fs/promises'

/** Un ordre : le canal du PCA9685 (0 à 15), l'angle de départ et d'arrivée (degrés, signés : 0 = le milieu), la vitesse (degrés par seconde, 0 = la plus rapide) et l'attente en bas de course (secondes). */
export interface ServoOrder {
  channel: number
  start: number
  end: number
  speed: number
  hold: number
}

/** Les trois ordres d'un volet. */
export interface ServoShutter {
  up: ServoOrder
  down: ServoOrder
  stop: ServoOrder
}

export interface ServoConfig {
  /** L'adresse de l'ESP32 des servos (http://192.168.1.115), commune à tous les volets. */
  url: string
  /** Les réglages de chaque volet, par numéro de volet. */
  shutters: Record<string, ServoShutter>
}

const idle = (channel: number): ServoOrder => ({ channel, start: 0, end: 0, speed: 10, hold: 0.5 })

export const DEFAULT_SERVO_SHUTTERS: Record<string, ServoShutter> = {
  // Salon : les réglages validés à la main.
  '2': {
    down: { channel: 0, start: -42, end: -50, speed: 10, hold: 0.5 },
    up: { channel: 1, start: 41, end: 50, speed: 10, hold: 0.5 },
    stop: { channel: 2, start: -42, end: -50, speed: 10, hold: 0.5 },
  },
  // PC et porte : angles à 0 (rien ne bouge tant qu'ils ne sont pas saisis).
  '5': { down: idle(3), up: idle(4), stop: idle(5) },
  '6': { down: idle(6), up: idle(7), stop: idle(8) },
}

export const DEFAULT_SERVO_CONFIG: ServoConfig = { url: 'http://192.168.1.115', shutters: DEFAULT_SERVO_SHUTTERS }

const finite = (value: unknown, fallback: number, min: number, max: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback

const orderOf = (value: unknown, fallback: ServoOrder): ServoOrder => {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const channel = finite(raw.channel, fallback.channel, 0, 15)
  return {
    channel: Number.isInteger(channel) ? channel : fallback.channel,
    start: finite(raw.start, fallback.start, -90, 90),
    end: finite(raw.end, fallback.end, -90, 90),
    speed: finite(raw.speed, fallback.speed, 0, Number.MAX_SAFE_INTEGER),
    hold: finite(raw.hold, fallback.hold, 0, Number.MAX_SAFE_INTEGER),
  }
}

const shutterOf = (value: unknown, fallback: ServoShutter): ServoShutter => {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  return { up: orderOf(raw.up, fallback.up), down: orderOf(raw.down, fallback.down), stop: orderOf(raw.stop, fallback.stop) }
}

/** Lit le fichier (relu à chaque ordre : un changement des réglages compte tout de suite). Fichier absent ou illisible : les valeurs par défaut ; un champ faux ou un volet manquant garde sa valeur par défaut. */
export const readServoConfig = async (file: string): Promise<ServoConfig> => {
  let raw: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(await readFile(file, 'utf8'))
    if (typeof parsed === 'object' && parsed !== null) raw = parsed as Record<string, unknown>
  } catch {
    // Pas de fichier (ou illisible) : les valeurs par défaut.
  }
  const url = typeof raw.url === 'string' && /^https?:\/\//.test(raw.url) ? raw.url.replace(/\/+$/, '') : DEFAULT_SERVO_CONFIG.url
  const saved = (typeof raw.shutters === 'object' && raw.shutters !== null ? raw.shutters : {}) as Record<string, unknown>
  // Ancienne forme : les trois ordres à la racine sont ceux du salon.
  if (raw.shutters === undefined && (raw.up !== undefined || raw.down !== undefined || raw.stop !== undefined)) saved['2'] = { up: raw.up, down: raw.down, stop: raw.stop }
  return { url, shutters: Object.fromEntries(Object.entries(DEFAULT_SERVO_SHUTTERS).map(([id, fallback]) => [id, shutterOf(saved[id], fallback)])) }
}
