import type { SliceTone } from './types'

export const SIZE = 200
export const STROKE = 36
export const RADIUS = (SIZE - STROKE) / 2
/** Une part non vide garde au moins cette longueur (en unités du dessin, soit 1 px) pour rester visible. */
export const MIN_LENGTH = 1
/** Une part plus courte que cela reçoit une zone de survol plus large, invisible, pour qu'on puisse la viser. */
export const HIT_LENGTH = 10

export const WRAP_CLASS = 'mt-3 flex flex-wrap items-center justify-center gap-6 rounded-xl border border-line bg-card px-4 py-3 lg:justify-start'
export const SVG_CLASS = 'size-[200px] shrink-0 -rotate-90'
export const ARC_CLASS = 'transition-[filter]'
/** Une part survolée garde sa couleur, en plus claire : sur la grande part « Libre », le blanc éblouissait. */
export const ARC_ACTIVE_CLASS = 'brightness-150'
export const HIT_CLASS = 'stroke-transparent'
export const CENTER_WRAP_CLASS = 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center'
export const CENTER_VALUE_CLASS = 'text-[1.3rem] font-bold tabular-nums'
export const CENTER_LABEL_CLASS = 'max-w-[8rem] text-center text-[0.8rem] leading-tight text-muted'
export const CHART_CLASS = 'relative size-[200px] shrink-0'
export const LEGEND_CLASS = 'flex min-w-[220px] flex-1 flex-col gap-1.5'
export const ROW_CLASS = 'flex items-center gap-2 rounded-md px-1.5 py-0.5 text-[0.9rem] transition-colors'
export const ROW_ACTIVE_CLASS = 'bg-line/40 font-semibold'
export const DOT_CLASS = 'size-3 shrink-0 rounded-full'
export const NAME_CLASS = 'flex-1'
export const VALUE_CLASS = 'tabular-nums text-muted'

/** Les classes complètes, pour que Tailwind les trouve. */
export const STROKE_CLASS: Record<SliceTone, string> = {
  accent: 'stroke-accent',
  green: 'stroke-green',
  orange: 'stroke-orange',
  danger: 'stroke-danger',
  muted: 'stroke-muted',
  line: 'stroke-line',
}

export const DOT_TONE_CLASS: Record<SliceTone, string> = {
  accent: 'bg-accent',
  green: 'bg-green',
  orange: 'bg-orange',
  danger: 'bg-danger',
  muted: 'bg-muted',
  line: 'bg-line',
}
