export const WIDTH = 300
export const HEIGHT = 120
export const GRID = [0.25, 0.5, 0.75]
export const TICKS = [0, 0.5, 1]

export const WRAP_CLASS = 'mt-3 rounded-xl border border-line bg-card px-4 py-3'
export const BODY_CLASS = 'my-2 flex gap-2'
export const SCALE_CLASS = 'relative h-[7.5rem] w-14 shrink-0 text-[0.7rem] tabular-nums text-muted'
export const TICK_CLASS = 'absolute right-0 -translate-y-1/2'
export const SVG_CLASS = 'h-[7.5rem] min-w-0 flex-1'
export const TIME_CLASS = 'flex justify-between pl-[4rem] text-[0.7rem] text-muted'
export const GRID_CLASS = 'stroke-line'
export const LINE_CLASS = 'fill-none [vector-effect:non-scaling-stroke]'
export const LEGEND_CLASS = 'm-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[0.8rem]'
export const LEGEND_ITEM_CLASS = 'flex items-center gap-1.5'
export const SWATCH_CLASS = 'inline-block h-0.5 w-4 rounded'
export const EMPTY_CLASS = 'm-0 py-6 text-center text-[0.85rem] text-muted'

/** Les classes complètes, pour que Tailwind les trouve. */
export const STROKE_CLASS = {
  accent: 'stroke-accent',
  green: 'stroke-green',
  orange: 'stroke-orange',
  danger: 'stroke-danger',
  muted: 'stroke-muted',
  line: 'stroke-line',
} as const
export const BG_CLASS = {
  accent: 'bg-accent',
  green: 'bg-green',
  orange: 'bg-orange',
  danger: 'bg-danger',
  muted: 'bg-muted',
  line: 'bg-line',
} as const
