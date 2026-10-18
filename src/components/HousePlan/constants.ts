export { BASEMENT_ROOMS, DOOR, GARDEN, GATE, GROUND_ROOMS, HOUSE, NICHOIR, PATH, STAIRS } from '@/plan'

export const STEP_COUNT = 8

export const GARDEN_LABEL = { x: 16, y: 26 }
export const GATE_LABEL = { x: 90, y: 269 }
export const ROOM_LABEL_OFFSET = { x: 8, y: 16 }

/** Couleurs de la page (fond, carte, ligne, texte) : le plan se fond dans l'interface. */
export const GARDEN_CLASS = 'fill-bg stroke-line stroke-[1.5]'
export const EARTH_CLASS = 'fill-bg stroke-line stroke-[1.5]'
export const HOUSE_CLASS = 'fill-card stroke-fg stroke-[3]'
export const ROOM_CLASS = 'fill-none stroke-line stroke-1'
export const ROOM_LABEL_CLASS = 'fill-muted text-[11px]'
export const AREA_LABEL_CLASS = 'fill-muted text-xs font-semibold'
export const EARTH_LABEL_CLASS = 'fill-muted text-xs font-semibold'
export const PATH_CLASS = 'fill-line/40'
export const GATE_CLASS = 'stroke-fg stroke-[6] [stroke-linecap:round]'
export const DOOR_CLASS = 'stroke-fg stroke-[5]'
export const STEP_CLASS = 'stroke-muted stroke-1'
export const NICHOIR_CLASS = 'fill-card stroke-muted stroke-2'
export const NICHOIR_LABEL_CLASS = 'fill-muted text-[11px] font-semibold'
