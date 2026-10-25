import type { RangeId } from './types'

const HOUR = 3600
export const DEFAULT_RANGE: RangeId = '24h'
/** Durée de chaque fenêtre, en secondes, et le pas des graduations. */
export const RANGES: { id: RangeId; label: string; seconds: number; tick: number }[] = [
  { id: '1h', label: '1 h', seconds: HOUR, tick: 10 * 60 },
  { id: '6h', label: '6 h', seconds: 6 * HOUR, tick: HOUR },
  { id: '24h', label: '24 h', seconds: 24 * HOUR, tick: 3 * HOUR },
  { id: '7d', label: '7 j', seconds: 7 * 24 * HOUR, tick: 24 * HOUR },
]
/** Largeur minimale d'un événement sur l'axe, en % : un événement court reste cliquable. */
export const MIN_WIDTH = 1.2
export const RANGE_LABEL = 'Fenêtre'
export const EMPTY_TEXT = 'Aucun événement dans cette fenêtre.'
export const OLDER_PREFIX = '+ '
export const OLDER_SUFFIX = ' plus ancien(s), hors fenêtre'
export const HINT = 'Le bord droit est maintenant. Clique sur un événement pour voir son clip.'

export const WRAP_CLASS = 'mt-3'
export const HEAD_CLASS = 'flex flex-wrap items-center justify-between gap-2 text-[0.85rem] text-muted'
export const AXIS_CLASS = 'relative mt-2 h-16 select-none rounded-lg border border-line border-r-2 border-r-accent bg-card'
export const TICK_CLASS = 'absolute top-0 h-full border-l border-line'
export const TICK_LABEL_CLASS = 'absolute bottom-0.5 -translate-x-1/2 text-[0.7rem] text-muted'
export const MARKER_CLASS = 'absolute top-2 h-7 cursor-pointer rounded border p-0 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-accent'
export const MARKER_IDLE_CLASS = 'border-accent bg-accent/60'
export const MARKER_SELECTED_CLASS = 'border-accent bg-accent'
export const EMPTY_CLASS = 'absolute inset-0 flex items-center justify-center text-[0.85rem] text-muted'
export const DETAIL_CLASS = 'mt-3'
export const DETAIL_TEXT_CLASS = 'mb-1 text-[0.9rem]'
export const NO_CLIP_TEXT = 'Pas de clip pour cet événement.'
