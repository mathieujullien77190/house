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
  /** Secondes de mouvement continu avant d'ouvrir un événement : un mouvement plus court (une goutte de pluie, un insecte, un parasite) n'ouvre rien. Réglée par caméra depuis House Sync. */
  minSeconds: number
  /** Secondes sans mouvement avant de fermer l'événement. */
  endSeconds: number
}

/** La durée minimale d'un mouvement, en secondes entières : 0 (le premier mouvement ouvre un événement) à 30. */
export const MIN_MOTION_SECONDS = 0
export const MAX_MOTION_SECONDS = 30
export const isMotionSeconds = (value: number): boolean => Number.isInteger(value) && value >= MIN_MOTION_SECONDS && value <= MAX_MOTION_SECONDS

export const DEFAULT_CONFIG: DetectorConfig = {
  pixelThreshold: 25,
  areaThreshold: 0.005,
  lightChangeThreshold: 0.6,
  minSeconds: 1,
  endSeconds: 5,
}

/**
 * Part des pixels (0 à 1) qui ont changé de plus de `pixelThreshold` entre deux images de même taille. Avec un `mask` (1 = pixel surveillé),
 * seuls les pixels surveillés comptent, et la part est celle de la zone surveillée (une petite zone remplie par un mouvement vaut 1).
 */
export const changedShare = (
  previous: Uint8Array,
  current: Uint8Array,
  pixelThreshold: number,
  mask: Uint8Array | null = null,
): number => {
  if (previous.length !== current.length || current.length === 0) return 0
  if (mask && mask.length !== current.length) return 0
  let changed = 0
  let watched = 0
  for (let i = 0; i < current.length; i += 1) {
    if (mask && mask[i] === 0) continue
    watched += 1
    if (Math.abs(current[i] - previous[i]) > pixelThreshold) changed += 1
  }
  return watched === 0 ? 0 : changed / watched
}

export type MotionEvent =
  { type: 'start'; at: number; score: number } | { type: 'end'; at: number; startedAt: number; durationSeconds: number; peak: number }

/** Un calme plus court que cela ne casse pas un mouvement qui n'a pas encore duré assez (un objet qui bouge peut s'immobiliser une image) : au-delà, on oublie son début. */
export const GAP_SECONDS = 1

/**
 * La machine à états : on lui donne la part de pixels changés de chaque image, elle rend un événement quand il y en a un. Un mouvement n'ouvre un événement
 * que s'il dure **au moins `minSeconds`** ; l'événement commence alors à l'instant où le mouvement a commencé (pas `minSeconds` plus tard : le clip ne perd rien).
 */
export const createDetector = (config: DetectorConfig = DEFAULT_CONFIG) => {
  // Le début du mouvement en cours, tant qu'il n'a pas duré assez pour ouvrir un événement.
  let candidateAt: number | null = null
  let startedAt: number | null = null
  let lastMotionAt = 0
  let peak = 0

  return {
    /** `share` : part de pixels changés (0 à 1) ; `at` : l'heure de l'image, en secondes. */
    push: (share: number, at: number): MotionEvent | null => {
      // Un changement global de lumière n'est pas un mouvement : on l'ignore.
      const moving = share >= config.areaThreshold && share < config.lightChangeThreshold
      if (moving) {
        lastMotionAt = at
        peak = Math.max(peak, share)
        if (startedAt !== null) return null
        candidateAt ??= at
        if (at - candidateAt >= config.minSeconds) {
          startedAt = candidateAt
          return { type: 'start', at: candidateAt, score: share }
        }
        return null
      }
      if (startedAt === null) {
        // Un calme trop long avant que le mouvement ait duré assez : ce n'était pas un mouvement.
        if (candidateAt !== null && at - lastMotionAt >= GAP_SECONDS) {
          candidateAt = null
          peak = 0
        }
        return null
      }
      if (at - lastMotionAt >= config.endSeconds) {
        const event: MotionEvent = { type: 'end', at, startedAt, durationSeconds: lastMotionAt - startedAt, peak }
        startedAt = null
        candidateAt = null
        peak = 0
        return event
      }
      return null
    },
    /** Vrai tant qu'un événement est ouvert. */
    isOpen: (): boolean => startedAt !== null,
  }
}
