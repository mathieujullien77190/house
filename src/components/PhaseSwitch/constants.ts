import type { Phase } from '@/nodes'

export const GROUP_LABEL = 'Phase de déploiement'

export const PHASES: { id: Phase; title: string; summary: string }[] = [
  { id: 0, title: 'Phase 0 · Version light', summary: '1 Reolink 4K, 1 switch PoE, enregistrement sur ton PC' },
  { id: 1, title: 'Phase 1 · Strict minimum', summary: '3 Pi (2 Pi5 + sauvegarde), 1 switch, 2 mini-caméras Pi Zero' },
  { id: 2, title: 'Phase 2 · Installation complète', summary: '+ 2ᵉ switch, 2 Reolink au portail et onduleur' },
]

export const CARD_CLASS =
  'cursor-pointer rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-camera'
export const ACTIVE_CLASS = 'border-camera bg-camera/10'
export const IDLE_CLASS = 'border-line bg-card hover:border-camera'
