// Le détecteur de mouvement : des fonctions pures, sans ffmpeg ni réseau, pour pouvoir les tester et les faire évoluer.
// Une image = des niveaux de gris (un octet par pixel). Le mouvement = la part des pixels qui ont assez changé
// depuis l'image précédente. Une machine à états en fait des événements (début, fin).

export interface DetectorConfig {
  /** Écart minimal de gris (0 à 255) pour qu'un pixel compte comme changé. */
  pixelThreshold: number
  /** Part minimale des pixels changés (0 à 1) pour parler de mouvement. */
  areaThreshold: number
  /** Au-delà de cette part, c'est un changement de lumière (interrupteur, nuage) et non un mouvement. */
  lightChangeThreshold: number
  /** Images consécutives en mouvement avant d'ouvrir un événement (évite un parasite isolé). */
  startFrames: number
  /** Secondes sans mouvement avant de fermer l'événement. */
  endSeconds: number
}

export const DEFAULT_CONFIG: DetectorConfig = {
  pixelThreshold: 25,
  areaThreshold: 0.005,
  lightChangeThreshold: 0.6,
  startFrames: 2,
  endSeconds: 5,
}

/** Part des pixels (0 à 1) qui ont changé de plus de `pixelThreshold` entre deux images de même taille. */
export const changedShare = (previous: Uint8Array, current: Uint8Array, pixelThreshold: number): number => {
  if (previous.length !== current.length || current.length === 0) return 0
  let changed = 0
  for (let i = 0; i < current.length; i += 1) {
    if (Math.abs(current[i] - previous[i]) > pixelThreshold) changed += 1
  }
  return changed / current.length
}

export type MotionEvent =
  | { type: 'start'; at: number; score: number }
  | { type: 'end'; at: number; startedAt: number; durationSeconds: number; peak: number }

/** La machine à états : on lui donne la part de pixels changés de chaque image, elle rend un événement quand il y en a un. */
export const createDetector = (config: DetectorConfig = DEFAULT_CONFIG) => {
  let streak = 0
  let startedAt: number | null = null
  let lastMotionAt = 0
  let peak = 0

  return {
    /** `share` : part de pixels changés (0 à 1) ; `at` : l'heure de l'image, en secondes. */
    push: (share: number, at: number): MotionEvent | null => {
      // Un changement global de lumière n'est pas un mouvement : on l'ignore.
      const moving = share >= config.areaThreshold && share < config.lightChangeThreshold
      if (moving) {
        streak += 1
        lastMotionAt = at
        peak = Math.max(peak, share)
        if (startedAt === null && streak >= config.startFrames) {
          startedAt = at
          return { type: 'start', at, score: share }
        }
        return null
      }
      streak = 0
      if (startedAt !== null && at - lastMotionAt >= config.endSeconds) {
        const event: MotionEvent = { type: 'end', at, startedAt, durationSeconds: lastMotionAt - startedAt, peak }
        startedAt = null
        peak = 0
        return event
      }
      return null
    },
    /** Vrai tant qu'un événement est ouvert. */
    isOpen: (): boolean => startedAt !== null,
  }
}
