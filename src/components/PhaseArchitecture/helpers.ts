import { DISK_SHAPE } from './constants'
import type { ArchBox, ArchDisk, ArchPanel } from './types'

const LINE_HEIGHT = 18

/** Position du titre d'un bloc : le titre et ses lignes sont centrés verticalement. */
export const titleY = (b: ArchBox): number => {
  return b.y + b.h / 2 - (b.lines.length * LINE_HEIGHT) / 2 + 4
}

export const lineY = (b: ArchBox, i: number): number => {
  return titleY(b) + 20 + i * LINE_HEIGHT
}

/** Le titre d'un cadre sert de légende en haut à gauche ; le cadre Docker est plus compact. */
export const panelTitlePos = (p: ArchPanel): { x: number; y: number; anchor: 'start' | 'end' } => {
  const y = p.tone === 'warm' ? p.y + 22 : p.y + 28
  if (p.titleEnd) return { x: p.x + p.w - 16, y, anchor: 'end' }
  return { x: p.x + (p.tone === 'warm' ? 16 : 20), y, anchor: 'start' }
}

/** Corps d'un cylindre : côtés, fond arrondi, puis haut arrondi. */
export const diskPath = (d: ArchDisk): string => {
  const { ry } = DISK_SHAPE
  const rx = d.rx ?? DISK_SHAPE.rx
  const body = DISK_SHAPE.body + Math.max(0, d.lines.length - 1) * LINE_HEIGHT
  const k = (rx * 4) / 9
  return `M${d.cx - rx} ${d.cy} v${body} c0 14 ${k} ${ry} ${rx} ${ry} s${rx} -8 ${rx} -${ry} v-${body} c0 -14 -${k} -${ry} -${rx} -${ry} s-${rx} 8 -${rx} ${ry} z`
}

export const diskTitleY = (d: ArchDisk): number => d.cy + 42
export const diskLineY = (d: ArchDisk, i: number): number => d.cy + 60 + i * LINE_HEIGHT
