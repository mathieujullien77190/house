import type { DomainId } from '@/domotics'

export interface DomainProps {
  id: DomainId
}

/** Un élément de la liste, prêt à afficher. */
export interface ItemView {
  id: string
  title: string
  text: string
  /** Prix déjà mis en forme, absent si on ne le connaît pas. */
  price?: string
  url?: string
}

export type ColumnId = 'inPlace' | 'planned'

export interface ColumnView {
  id: ColumnId
  label: string
  items: ItemView[]
  /** Somme des prix connus, absente s'il n'y en a aucun. */
  total?: string
  empty: string
}

export interface DomainUIProps {
  title: string
  intro: string
  columns: ColumnView[]
}
