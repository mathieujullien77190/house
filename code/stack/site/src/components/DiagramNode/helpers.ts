import type { DiagramNode } from '@/nodes'
import { GHOST_CLASS, GROUP_CLASS, KIND_STROKE, RECT_BASE_CLASS } from './constants'

export const groupClass = (ghost: boolean): string => (ghost ? `${GROUP_CLASS} ${GHOST_CLASS}` : GROUP_CLASS)

export const rectClass = (kind: DiagramNode['kind'], selected: boolean): string => {
  return `${RECT_BASE_CLASS} ${KIND_STROKE[kind]} ${selected ? 'stroke-[3]' : 'stroke-[1.5]'}`
}

export const ariaLabel = (n: DiagramNode): string => {
  return `${n.title} – ${n.sub}${n.zone ? ` – zone ${n.zone}` : ''}`
}
