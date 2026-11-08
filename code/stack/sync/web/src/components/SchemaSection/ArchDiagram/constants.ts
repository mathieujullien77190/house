import type { BoxTone, PanelTone } from '../types'

/** Une seule classe par propriété (fond, contour) : l'ordre des classes Tailwind n'est pas garanti. */
export const BOX_CLASS: Record<BoxTone, string> = {
  plain: 'fill-card stroke-fg stroke-[1.5]',
  warm: 'fill-orange/10 stroke-orange stroke-[1.5]',
  green: 'fill-green/10 stroke-green stroke-[1.5]',
  dashed: 'fill-card stroke-muted stroke-[1.5] [stroke-dasharray:6_4]',
}

export const PANEL_CLASS: Record<PanelTone, string> = {
  panel: 'fill-bg stroke-line stroke-[1.5]',
  warm: 'fill-orange/10 stroke-orange stroke-[1.5]',
}

export const PANEL_TITLE_CLASS = 'fill-fg text-[15px] font-bold'
export const DOCKER_TITLE_CLASS = 'fill-fg text-[13px] font-bold'
export const BOX_TITLE_CLASS = 'fill-fg text-sm font-bold'
export const BOX_LINE_CLASS = 'fill-muted text-[11.5px]'
export const ARROW_CLASS = 'fill-none stroke-fg stroke-[1.6]'
export const ARROW_DASHED_CLASS = 'fill-none stroke-muted stroke-[1.6] [stroke-dasharray:6_4]'
/** Le tunnel VPN : en bleu, à longs tirets, comme dans le plan de la maison. */
export const ARROW_VPN_CLASS = 'fill-none stroke-vpn stroke-[2.2] [stroke-dasharray:10_5]'
/** Le trajet du direct : en violet, trait plein plus épais. */
export const ARROW_LIVE_CLASS = 'fill-none stroke-switch stroke-[2.6]'
export const MARKER_CLASS = 'fill-fg'
export const MARKER_LIVE_CLASS = 'fill-switch'
export const LIVE_LABEL_CLASS = 'fill-switch text-[11.5px] font-semibold'
export const LABEL_CLASS = 'fill-fg text-[11.5px]'
export const VPN_LABEL_CLASS = 'fill-vpn text-[11.5px] font-semibold'
export const NOTE_CLASS = 'fill-muted text-[10.5px]'
export const DISK_CLASS = 'fill-green/10 stroke-green stroke-[1.5]'
export const DISK_TOP_CLASS = 'fill-green/20 stroke-green stroke-[1.5]'

/** Demi-largeur, rayon vertical de l'ellipse et hauteur du corps d'un disque. */
export const DISK_SHAPE = { rx: 70, ry: 22, body: 50 }

export const LINE_HEIGHT = 18
