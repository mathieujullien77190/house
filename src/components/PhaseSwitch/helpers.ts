import { euro } from '@/catalog'
import type { Phase } from '@/nodes'
import { ACTIVE_CLASS, CARD_CLASS, IDLE_CLASS, PHASES } from './constants'
import type { PhaseCard } from './types'

export const buildCards = (phase: Phase, totals: Record<Phase, number>): PhaseCard[] => {
  return PHASES.map((p) => ({
    ...p,
    total: euro(totals[p.id]),
    extra: p.id === 2 ? `+ ${euro(totals[2] - totals[1])} par rapport à la phase 1` : undefined,
    active: p.id === phase,
    className: `${CARD_CLASS} ${p.id === phase ? ACTIVE_CLASS : IDLE_CLASS}`,
  }))
}
