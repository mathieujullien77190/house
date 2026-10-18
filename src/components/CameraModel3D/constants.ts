import type { CameraModelKind, ModelSpec, PartLabel } from './types'

// Dimensions en millimètres (1 unité three.js = 1 mm). Valeurs approximatives des produits réels.
export const VIEW_HEIGHT = 380

export const COLORS = {
  pcb: 0x1f7a4d,
  metal: 0xc4c8d0,
  chip: 0x2a2d33,
  gold: 0xd4af37,
  cameraPcb: 0x1d4d3a,
  lensBody: 0x16181d,
  lensGlass: 0x4a2f7a,
  ribbon: 0xd99a4e,
  splitter: 0x2b3a55,
  adapter: 0xe8eaee,
  powerCable: 0x15171b,
  dataCable: 0x2f7de1,
  grid: 0x9aa3b2,
  shell: 0xeef0f3,
  led: 0xff4d4d,
  bracket: 0x8d95a3,
} as const

export const BOARD = { w: 65, d: 30, t: 1.4, radius: 3 }

/** Position des ports sur le bord avant (z > 0) du Pi Zero, en mm depuis le centre de la carte. */
export const PORTS = { hdmiX: -20.1, usbX: 8.9, powerX: 21.5, edgeZ: 13.2 }

export const CAMERA = { w: 25, h: 24, t: 1, x: 82, y: 14 }

export const RIBBON = {
  width: 16,
  steps: 40,
  /** Points de la nappe dans le plan XY (z = 0) : du connecteur du Pi à l'arrière de la caméra. */
  points: [
    [31, 3.2],
    [40, 4],
    [52, 14],
    [66, 16],
    [76, 9],
    [80.5, 6],
  ] as [number, number][],
}

export const GPIO = { cols: 20, pitch: 2.54, z: -12 }

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

const ZERO_LABELS: PartLabel[] = [
  { text: 'Pi Zero 2 W', at: [8, 17, -16] },
  { text: 'microSD', at: [-34, 7, 0] },
  { text: 'USB données', at: [13, 11, 17] },
  { text: 'Alimentation 5 V', at: [36, 8, 17] },
  { text: 'Nappe 22 → 15 broches', at: [57, 19, 0] },
  { text: 'Camera Module 3 NoIR', at: [82, 33, 0] },
  { text: 'Objectif', at: [96, 15, 0] },
  { text: 'Adaptateur Ethernet USB-OTG', at: [-22, 14, 34], extra: true },
  { text: 'Splitter PoE', at: [20, 19, 62], extra: true },
  { text: 'RJ45 vers le switch', at: [24, 9, 125], extra: true },
]

const REOLINK_LABELS: PartLabel[] = [
  { text: 'Boîtier étanche', at: [60, 38, 0] },
  { text: 'Pare-soleil', at: [150, 40, 0] },
  { text: 'Objectif', at: [140, 0, 0] },
  { text: 'LED infrarouges', at: [122, 30, 0] },
  { text: 'Support articulé', at: [35, -46, 16] },
  { text: 'Platine de fixation', at: [35, -66, 38] },
  { text: 'Câble RJ45 PoE', at: [-62, -42, 14] },
]

export const MODELS: Record<CameraModelKind, ModelSpec> = {
  zero: {
    position: { x: 55, y: 105, z: 175 },
    target: { x: 34, y: 2, z: 38 },
    floorY: -1,
    legend: [
      'Raspberry Pi Zero 2 W (65 × 30 mm)',
      'Camera Module 3 NoIR (25 × 24 mm)',
      'Nappe caméra 22 → 15 broches',
      'Splitter PoE 5 V (option affichée)',
      'Adaptateur Ethernet USB-OTG (option affichée)',
    ],
    labels: ZERO_LABELS,
    ariaLabel: 'Vue 3D du Pi Zero 2 W avec sa caméra : glisser pour tourner, Ctrl et molette pour zoomer',
  },
  camera: {
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
  },
}
