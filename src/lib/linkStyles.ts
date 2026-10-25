// Classes Tailwind des traits de liaison.
import type { LinkType } from '../nodes'

/** `highlight` : liaison d'un composant sélectionné ; `selected` : la liaison elle-même. */
export type LinkLevel = 'normal' | 'highlight' | 'selected'

const LINK_COLOR: Record<LinkType, string> = {
  poe: 'stroke-camera',
  eth: 'stroke-muted',
  wifi: 'stroke-muted',
  usb: 'stroke-muted',
}

const LINK_WIDTH: Record<LinkType, string> = {
  poe: 'stroke-[2.5]',
  eth: 'stroke-2',
  wifi: 'stroke-2',
  usb: 'stroke-2',
}

/** Le WiFi est en pointillés : pas de câble. */
const LINK_DASH: Record<LinkType, string> = {
  poe: '',
  eth: '',
  wifi: '[stroke-dasharray:2_6]',
  usb: '[stroke-dasharray:8_3]',
}

const LINK_GLOW: Record<LinkType, string> = {
  poe: '[filter:drop-shadow(0_0_3px_var(--camera))]',
  eth: '[filter:drop-shadow(0_0_3px_var(--muted))]',
  wifi: '[filter:drop-shadow(0_0_3px_var(--muted))]',
  usb: '[filter:drop-shadow(0_0_3px_var(--muted))]',
}

/** Une liaison mise en évidence garde la couleur de son type : plus épaisse, avec un halo. */
const LEVEL_WIDTH: Record<Exclude<LinkLevel, 'normal'>, string> = {
  highlight: 'stroke-4',
  selected: 'stroke-[5]',
}

export const linkClass = (type: LinkType, level: LinkLevel = 'normal'): string => {
  const style =
    level === 'normal' ? LINK_WIDTH[type] : `${LEVEL_WIDTH[level]} ${LINK_GLOW[type]}`
  return `${LINK_COLOR[type]} ${style} ${LINK_DASH[type]} [stroke-linecap:round]`.replace(/\s+/g, ' ')
}
