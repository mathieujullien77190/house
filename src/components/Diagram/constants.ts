import { CANVAS } from '@/nodes'
import type { FloorTab } from './types'

/** Marge autour du schéma pour que les traits épais ne soient pas coupés. */
export const MARGIN = 12
export const VIEW_BOX = `${-MARGIN} ${-MARGIN} ${CANVAS.w + 2 * MARGIN} ${CANVAS.h + 2 * MARGIN}`
export const ARIA_LABEL = 'Schéma du système de caméras'
export const CLUSTER_TITLE = 'Cluster k3s'

export const FLOORS: FloorTab[] = [
  { id: 'rdc', label: 'Rez-de-chaussée' },
  { id: 'basement', label: 'Sous-sol' },
]

export const STEP = 10
/** Distance (en unités du schéma) sous laquelle un glissement compte comme un simple clic. */
export const DRAG_THRESHOLD = 4
export const BIG_STEP = 50

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 2.5
export const ZOOM_STEP = 0.25
export const ZOOM_DEFAULT = 1
/** Largeur maximale du schéma à 100 %, en pixels. */
export const BASE_WIDTH = 900

export const SVG_CLASS = 'block h-auto max-w-none select-none'
export const VIEWPORT_CLASS = 'overflow-auto rounded-lg border border-line'
export const ZOOM_BAR_CLASS = 'mb-2 flex flex-wrap items-center gap-1.5'
export const LINK_DIM_CLASS = 'opacity-25'
export const ZOOM_BUTTON_CLASS = 'min-w-8 !px-2'
export const ZOOM_LABEL_CLASS = 'min-w-12 text-center text-[0.85rem] tabular-nums text-muted'
export const CLUSTER_RECT_CLASS = 'fill-none stroke-pi stroke-[1.5] opacity-70 [stroke-dasharray:6_5]'
export const CLUSTER_LABEL_CLASS = 'fill-pi text-xs font-semibold'
export const LINK_HIT_CLASS = 'fill-none stroke-transparent stroke-[16] cursor-pointer [pointer-events:stroke]'
