import type { ColumnId } from './types'

export const COLUMN_LABEL: Record<ColumnId, string> = {
  inPlace: 'En place',
  planned: 'En préparation',
}

export const COLUMN_EMPTY: Record<ColumnId, string> = {
  inPlace: 'Rien pour l’instant.',
  planned: 'Rien en préparation.',
}

export const TOTAL_LABEL = 'Budget connu'
export const LINK_CLASS = 'underline decoration-dotted underline-offset-2 hover:text-accent'
