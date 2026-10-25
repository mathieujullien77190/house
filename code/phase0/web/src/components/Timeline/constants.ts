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

export const RANGE_LABEL = 'Fenêtre'
export const EARLIER_LABEL = '◀'
export const LATER_LABEL = '▶'
export const NOW_LABEL = 'Maintenant'
export const EMPTY_TEXT = 'Aucun événement dans cette fenêtre.'
export const OLDER_PREFIX = '+ '
export const OLDER_SUFFIX = ' plus ancien(s) avant'
export const HINT = 'Glisse l’axe pour te déplacer, molette pour zoomer. Clique un instant pour voir l’image, un événement pour voir son clip (en haut).'

export const WRAP_CLASS = 'mt-3'
export const HEAD_CLASS = 'flex flex-wrap items-center justify-between gap-2 text-[0.85rem] text-muted'
export const CONTROLS_CLASS = 'flex flex-wrap items-center gap-2'
export const WINDOW_CLASS = 'mt-1 text-[0.8rem] text-muted'
export const AXIS_CLASS = 'relative mt-2 h-16 cursor-grab touch-none select-none overflow-hidden rounded-lg border border-line bg-card active:cursor-grabbing'
export const AXIS_LIVE_CLASS = 'border-r-2 border-r-accent'
export const COVERAGE_CLASS = 'pointer-events-none absolute bottom-5 h-1.5 rounded-sm bg-accent/30'
export const TICK_CLASS = 'pointer-events-none absolute top-0 h-full border-l border-line'
export const TICK_LABEL_CLASS = 'absolute bottom-0.5 -translate-x-1/2 whitespace-nowrap text-[0.7rem] text-muted'
export const MARKER_CLASS = 'absolute top-2 h-7 cursor-pointer rounded border p-0 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-accent'
export const MARKER_IDLE_CLASS = 'border-accent bg-accent/60'
export const MARKER_SELECTED_CLASS = 'border-accent bg-accent'
export const CURSOR_CLASS = 'pointer-events-none absolute top-0 h-full w-0.5 -translate-x-1/2 bg-danger'
export const EMPTY_CLASS = 'pointer-events-none absolute inset-0 flex items-center justify-center text-[0.85rem] text-muted'
