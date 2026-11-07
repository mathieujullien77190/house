import type { ReactNode } from 'react'

export interface SimpleTableProps {
  /** Les titres des colonnes. */
  columns: string[]
  /** Une ligne = une cellule par colonne (du texte ou n'importe quel élément). */
  rows: ReactNode[][]
  /** Clé stable de chaque ligne. */
  keys: string[]
}
