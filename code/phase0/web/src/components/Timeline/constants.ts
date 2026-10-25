import type { RangeId } from './types'

const MINUTE = 60
const HOUR = 3600
const DAY = 86400
/** Les raccourcis de fenêtre, en secondes. */
export const RANGES: { id: RangeId; label: string; seconds: number }[] = [
  { id: '10m', label: '10 min', seconds: 10 * MINUTE },
  { id: '1h', label: '1 h', seconds: HOUR },
  { id: '6h', label: '6 h', seconds: 6 * HOUR },
  { id: '24h', label: '24 h', seconds: DAY },
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
/** La fenêtre change vite (glisser, zoom, direct) : on attend ce calme (ms) avant de demander ses événements. */
export const EVENTS_DEBOUNCE_MS = 250
/** En direct, la fenêtre avance sans cesse : images gardées et événements ne sont redemandés que quand elle a avancé d'une dixième de sa durée (10 s au moins). */
export const REFETCH_DIVISOR = 10
export const MIN_REFETCH_SECONDS = 10
/** En deçà de ce déplacement (pixels), un glisser compte pour un clic. */
export const DRAG_THRESHOLD = 4
/** En direct, la fenêtre garde cette part de sa durée à droite de « maintenant » : le futur, vide. */
export const FUTURE_SHARE = 0.5
/** On peut faire glisser le futur jusqu'à centrer « maintenant » : au plus cette part de la fenêtre à droite. */
export const MAX_FUTURE_SHARE = 0.5
/** À moins de cette part de la fenêtre du bord en direct, la fenêtre s'y accroche et suit l'heure. */
export const SNAP_SHARE = 0.02
/** Après un clic sur l'axe, le curseur avance tout seul en temps réel (une seconde par seconde) ; l'image, elle, ne change qu'à chaque image gardée (une par minute). */
export const PLAY_INTERVAL_MS = 1000
/** Sans liste d'images connue, l'image est redemandée au plus toutes les 60 secondes. */
export const FALLBACK_IMAGE_SECONDS = 60
/** Le curseur qui avance repousse la fenêtre quand il dépasse cette part de l'axe. */
export const FOLLOW_EDGE = 0.92
/** Le bouton « Maintenant » zoome sur cette fenêtre (secondes), « maintenant » au centre : on lit les secondes. */
export const NOW_ZOOM_SECONDS = 60
/** En direct, la fenêtre avance au plus à ce rythme (ms) ; une fenêtre courte avance plus souvent, pour que la ligne « maintenant » reste juste. */
export const MAX_REFRESH_MS = 60_000
export const MIN_REFRESH_MS = 1000
