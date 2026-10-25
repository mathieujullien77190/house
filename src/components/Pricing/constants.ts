import type { Source } from '@/catalog'

export const REPO_URL = 'https://github.com/mathieujullien77190/birds'

export const SOURCE_LABEL: Record<Source, string> = {
  repo: 'dépôt',
  estimation: 'estimation',
  perso: 'perso',
}

export const LINK_CLASS = 'underline decoration-dotted underline-offset-2 hover:text-accent'
export const TH_CLASS = 'border-b border-line px-2.5 py-1.5 text-left text-xs font-semibold text-muted'
export const TD_CLASS = 'border-b border-line px-2.5 py-1.5 align-middle'
export const NUM_CLASS = 'whitespace-nowrap text-right tabular-nums'
