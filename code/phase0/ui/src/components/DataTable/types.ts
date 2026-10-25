import type { ReactNode } from 'react'

export interface DataTableProps {
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
  /** Vrai quand la table est repliée (titre et description seulement) ; sans onToggle, elle est toujours ouverte. */
  collapsed?: boolean
  onToggle?: () => void
}
