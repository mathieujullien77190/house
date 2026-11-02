import type { SliceTone } from '../PieChart'

export const WIDTH = 300
export const HEIGHT = 80
/** Les lignes de repère, en fraction de la hauteur. */
export const GRID = [0.25, 0.5, 0.75]
/** Les repères de l'échelle verticale, en fraction du maximum : le bas, le milieu et le haut. */
export const TICKS = [0, 0.5, 1]

export const WRAP_CLASS = 'mt-3 rounded-xl border border-line bg-card px-4 py-3'
export const HEAD_CLASS = 'flex items-baseline justify-between gap-3'
export const TITLE_CLASS = 'text-[0.9rem] text-muted'
export const VALUE_CLASS = 'text-[1.3rem] font-bold tabular-nums'
export const BODY_CLASS = 'my-2 flex gap-2'
export const SCALE_CLASS = 'relative h-20 w-11 shrink-0 text-[0.7rem] tabular-nums text-muted'
export const TICK_CLASS = 'absolute right-0 -translate-y-1/2'
export const SVG_CLASS = 'h-20 min-w-0 flex-1'
export const TIME_CLASS = 'flex justify-between pl-[3.25rem] text-[0.7rem] text-muted'
export const GRID_CLASS = 'stroke-line'
export const LINE_CLASS = 'fill-none [vector-effect:non-scaling-stroke]'

/** Les classes complètes, pour que Tailwind les trouve. */
export const STROKE_CLASS: Record<SliceTone, string> = {
  accent: 'stroke-accent',
  green: 'stroke-green',
  orange: 'stroke-orange',
  danger: 'stroke-danger',
  muted: 'stroke-muted',
  line: 'stroke-line',
}

export const FILL_CLASS: Record<SliceTone, string> = {
  accent: 'fill-accent/15',
  green: 'fill-green/15',
  orange: 'fill-orange/15',
  danger: 'fill-danger/15',
  muted: 'fill-muted/15',
  line: 'fill-line/15',
}
