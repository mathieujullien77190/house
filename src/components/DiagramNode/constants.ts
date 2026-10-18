import type { NodeKind } from '@/nodes'

export const KIND_STROKE: Record<NodeKind, string> = {
  camera: 'stroke-camera',
  zero: 'stroke-camera',
  switch: 'stroke-switch',
  pi: 'stroke-pi',
  backup: 'stroke-backup',
  solar: 'stroke-solar',
  custom: 'stroke-muted',
}

export const GROUP_CLASS = 'group cursor-grab touch-none outline-none transition-opacity active:cursor-grabbing'
export const GHOST_CLASS = 'pointer-events-none opacity-20'
export const RECT_BASE_CLASS =
  'fill-card transition-[stroke-width] group-hover:stroke-[3] group-focus-visible:stroke-[3]'

export const TITLE_CLASS = 'fill-fg text-[11px] font-semibold'
export const SUB_CLASS = 'fill-muted text-[9px]'
export const ZONE_CLASS = 'fill-camera text-[7px] font-semibold uppercase tracking-wider'

/** Décalages verticaux du texte par rapport au milieu du composant. */
export const TITLE_DY = -2
export const SUB_DY = 9
export const ZONE_Y = 8
/** Avec une zone, titre et description descendent pour lui laisser la place. */
export const ZONE_SHIFT = 4

export const BADGE_CLASS = 'fill-backup'
export const BOLT_CLASS = 'fill-white'
/** Éclair centré sur (0, 0). */
export const BOLT_PATH = 'M 0.8 -4.5 L -3 0.8 H -0.4 L -0.8 4.5 L 3 -0.8 H 0.4 Z'
export const BADGE_RADIUS = 7
