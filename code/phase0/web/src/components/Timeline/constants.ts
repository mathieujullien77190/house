import type { RangeId } from './types'

const MINUTE = 60
const HOUR = 3600
const DAY = 86400
export const DEFAULT_RANGE: RangeId = '24h'
/** Les raccourcis de fenêtre, en secondes. */
export const RANGES: { id: RangeId; label: string; seconds: number }[] = [
  { id: '10m', label: '10 min', seconds: 10 * MINUTE },
  { id: '1h', label: '1 h', seconds: HOUR },
  { id: '6h', label: '6 h', seconds: 6 * HOUR },
  { id: '24h', label: '24 h', seconds: DAY },
  { id: '7d', label: '7 j', seconds: 7 * DAY },
]
/** Bornes du zoom (molette ou clic sur un événement), en secondes. */
export const MIN_WINDOW = 20
export const MAX_WINDOW = 14 * DAY
/** Un cran de molette multiplie ou divise la fenêtre par ce facteur. */
export const WHEEL_FACTOR = 1.25
/** Au clic sur un événement, sa durée occupe cette part de l'axe. */
export const EVENT_FOCUS_SHARE = 0.5
/** Pas de graduation possibles ; on prend le plus petit qui donne au plus MAX_TICKS graduations. */
export const TICK_STEPS = [5, 10, 30, MINUTE, 2 * MINUTE, 5 * MINUTE, 10 * MINUTE, 15 * MINUTE, 30 * MINUTE, HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY]
export const MAX_TICKS = 12
/** Largeur minimale d'un événement sur l'axe, en % : un événement court reste cliquable. */
export const MIN_WIDTH = 1.2
/** Deux images à moins de ce délai (secondes) forment une même plage de couverture. */
export const COVERAGE_GAP = 150
/** En deçà de ce déplacement (pixels), un glisser compte pour un clic. */
export const DRAG_THRESHOLD = 4
/** « Maintenant » avance d'une minute à la fois, assez pour rester juste. */
export const NOW_REFRESH_MS = 60_000
