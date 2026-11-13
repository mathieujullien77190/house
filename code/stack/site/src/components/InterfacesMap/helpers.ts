import { CHIP_CHAR_WIDTH, CHIP_GAP, CHIP_HEIGHT, CHIP_PADDING, GROUP_GAP, LABEL_TO_CHIPS, NOTE_GAP } from './constants'
import type { Column, Layout, PlacedChip, PlacedLabel } from './types'

export const chipWidth = (text: string): number => Math.round(text.length * CHIP_CHAR_WIDTH + CHIP_PADDING)

/** Range des pastilles en lignes qui passent à la ligne dans `maxW` ; rend les pastilles et le bas atteint. */
const flow = (items: string[], x: number, y: number, maxW: number, role: Column['role'], idPrefix: string): { chips: PlacedChip[]; bottom: number } => {
  const chips: PlacedChip[] = []
  let cx = x
  let cy = y
  items.forEach((text, i) => {
    const w = chipWidth(text)
    if (cx + w > x + maxW) {
      cx = x
      cy += CHIP_HEIGHT + CHIP_GAP
    }
    chips.push({ id: `${idPrefix}-${i}`, x: cx, y: cy, w, h: CHIP_HEIGHT, text, role })
    cx += w + CHIP_GAP
  })
  return { chips, bottom: cy + CHIP_HEIGHT }
}

/** Pose les colonnes de groupes : une légende, ses pastilles, puis le groupe suivant plus bas. */
export const layoutColumns = (columns: Column[]): Layout => {
  const labels: PlacedLabel[] = []
  const chips: PlacedChip[] = []
  columns.forEach((column, c) => {
    let labelY = column.y
    column.groups.forEach((group, g) => {
      const id = `${c}-${g}`
      labels.push({ id: `label-${id}`, x: column.x, y: labelY, text: group.label, kind: 'group' })
      const placed = flow(group.items, column.x, labelY + LABEL_TO_CHIPS, column.maxW, column.role, `chip-${id}`)
      chips.push(...placed.chips)
      labelY = placed.bottom + GROUP_GAP
      if (g === column.groups.length - 1 && column.note) {
        labels.push({ id: `note-${c}`, x: column.x, y: placed.bottom + NOTE_GAP, text: column.note, kind: 'note' })
      }
    })
  })
  return { labels, chips }
}
