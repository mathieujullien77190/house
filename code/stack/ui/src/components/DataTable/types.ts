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
  /** Le détail de chaque ligne (un par ligne, null : pas de détail), montré sous la ligne quand on la touche ; sans lui, les lignes ne se déplient pas. */
  details?: (ReactNode | null)[]
  /** La clé de la ligne dépliée en ce moment, ou null : le parent tient cet état. */
  openKey?: string | null
  /** Un clic (ou Entrée) sur une ligne qui a un détail : le parent la déplie ou la replie. */
  onRowClick?: (key: string) => void
  /** Les filtres du tableau (un `TableFilters`), montrés sous la description quand il est ouvert. */
  filters?: ReactNode
  /** Vrai quand la table est repliée (titre et description seulement) ; sans onToggle, elle est toujours ouverte. */
  collapsed?: boolean
  onToggle?: () => void
}
