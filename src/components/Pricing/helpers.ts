import { PORTS_PER_SWITCH, euro, groups, portsNeeded, type Counts, type Line } from '@/catalog'
import type { Phase } from '@/nodes'
import { SOURCE_LABEL } from './constants'
import type { PricingRowView, PricingSectionView } from './types'

const lineTotal = (l: Line) => l.unit * l.qty

export const sum = (lines: Line[]): number => {
  return lines.reduce((s, l) => s + lineTotal(l), 0)
}

const toRow = (l: Line): PricingRowView => {
  return {
    id: l.id,
    label: l.label,
    note: l.note,
    unit: euro(l.unit),
    qty: l.qty,
    total: euro(lineTotal(l)),
    source: l.source,
    sourceLabel: SOURCE_LABEL[l.source],
    editable: l.editable,
    dimmed: l.qty === 0,
  }
}

export const buildSections = (lines: Line[]): PricingSectionView[] => {
  return groups.map((group) => {
    const inGroup = lines.filter((l) => l.group === group)
    return { group, subtotal: euro(sum(inGroup)), rows: inGroup.map(toRow) }
  })
}

export const portsLabel = (counts: Counts, phase: Phase): string => {
  return `${portsNeeded(counts, phase)} / ${counts.switches * PORTS_PER_SWITCH}`
}
