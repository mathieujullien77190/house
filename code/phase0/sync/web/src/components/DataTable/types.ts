import type { ReactNode } from 'react'

/** Un tableau paginé, rendu pur : les cellules arrivent déjà prêtes. */
export interface DataTableUIProps {
  title: string
  /** Ce que contient la table, en une phrase. */
  description: string
  /** Chemin ou détail en petit, à côté du titre. */
  detail: string
  columns: string[]
  /** Une ligne = une cellule rendue par colonne. */
  rows: ReactNode[][]
  /** Clé stable de chaque ligne. */
  keys: string[]
  page: number
  size: number
  total: number
  onPage: (page: number) => void
}
