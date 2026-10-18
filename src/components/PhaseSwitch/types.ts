import type { Phase } from '@/nodes'

export interface PhaseSwitchProps {
  phase: Phase
  /** Budget total de chaque phase, en euros. */
  totals: Record<Phase, number>
  onChange: (phase: Phase) => void
}

export interface PhaseCard {
  id: Phase
  title: string
  summary: string
  total: string
  /** Écart avec la phase 1 (absent pour la phase 1). */
  extra?: string
  active: boolean
  className: string
}

export interface PhaseSwitchUIProps {
  cards: PhaseCard[]
  onSelect: (phase: Phase) => void
}
