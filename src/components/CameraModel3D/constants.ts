import type { ModelSpec, PartLabel } from './types'

// Dimensions en millimètres (1 unité three.js = 1 mm). Valeurs approximatives du produit réel.
export const VIEW_HEIGHT = 380

export const COLORS = {
  lensBody: 0x16181d,
  dataCable: 0x2f7de1,
  grid: 0x9aa3b2,
  shell: 0xeef0f3,
  led: 0xff4d4d,
  bracket: 0x8d95a3,
} as const

/** Reolink : boîtier cylindrique le long de l'axe X, objectif vers +X, support en dessous. */
export const REOLINK = {
  bodyR: 31,
  bodyL: 118,
  visorR: 34,
  visorL: 74,
  lensR: 14,
  glassR: 10,
  ledRingR: 22,
  ledCount: 8,
  ballY: -36,
  plateY: -62,
}

export const LABEL_CLASS =
  'whitespace-nowrap rounded-md border border-line bg-card/90 px-1.5 py-0.5 text-[11px] font-medium text-fg shadow-sm'

const REOLINK_LABELS: PartLabel[] = [
  { text: 'Boîtier étanche', at: [60, 38, 0] },
  { text: 'Pare-soleil', at: [150, 40, 0] },
  { text: 'Objectif', at: [140, 0, 0] },
  { text: 'LED infrarouges', at: [122, 30, 0] },
  { text: 'Support articulé', at: [35, -46, 16] },
  { text: 'Platine de fixation', at: [35, -66, 38] },
  { text: 'Câble RJ45 PoE', at: [-62, -42, 14] },
]

export const MODEL: ModelSpec = {
  position: { x: 320, y: 60, z: 170 },
  target: { x: 80, y: -22, z: 0 },
  floorY: -72,
  legend: [
    'Boîtier étanche 60 × 66 × 192 mm (RLC-810A, fiche Reolink)',
    'Pare-soleil, objectif et LED infrarouges',
    'Support articulé et platine de fixation',
    'Câble RJ45 PoE',
  ],
  labels: REOLINK_LABELS,
  ariaLabel: 'Vue 3D d’une caméra Reolink : glisser pour tourner, Ctrl et molette pour zoomer',
}
