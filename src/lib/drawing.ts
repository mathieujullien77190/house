// Classes Tailwind communes aux dessins SVG des caméras.
const WIRE = 'fill-none stroke-[2.5] [stroke-linecap:round]'

export const D = {
  svg: 'mx-auto block h-auto w-full max-w-[760px]',
  part: 'fill-card stroke-muted stroke-2',
  partDashed: 'fill-card stroke-muted stroke-2 [stroke-dasharray:6_5]',
  board: 'fill-card stroke-camera stroke-[2.5]',
  body: 'fill-card stroke-camera stroke-[3]',
  lens: 'fill-bg stroke-fg stroke-2',
  glass: 'fill-switch stroke-none opacity-55',
  led: 'fill-backup stroke-none',
  cable: 'fill-none stroke-camera stroke-[5] [stroke-linecap:round]',
  leader: 'stroke-muted stroke-1',
  label: 'fill-fg text-[13px]',
  title: 'fill-fg text-sm font-semibold',
  note: 'fill-muted text-[11px]',
  pin: 'fill-fg',
  pinLabel: 'fill-fg text-[11px]',
  wirePower: `${WIRE} stroke-backup`,
  wirePowerDashed: `${WIRE} stroke-backup [stroke-dasharray:6_5]`,
  wireData: `${WIRE} stroke-camera`,
} as const
