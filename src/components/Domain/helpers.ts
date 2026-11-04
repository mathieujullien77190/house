import { euro } from '@/catalog'
import type { DomainInfo, DomainItem } from '@/domotics'
import { COLUMN_EMPTY, COLUMN_LABEL } from './constants'
import type { ColumnId, ColumnView, ItemView } from './types'

const itemView = (item: DomainItem): ItemView => ({
  id: item.id,
  title: item.title,
  text: item.text,
  price: item.price === undefined ? undefined : euro(item.price),
  url: item.url,
})

/** Somme des prix connus d'une liste ; absente quand aucun élément n'a de prix. */
export const totalOf = (items: DomainItem[]): number | null => {
  const priced = items.filter((item) => item.price !== undefined)
  if (priced.length === 0) return null
  return priced.reduce((sum, item) => sum + (item.price ?? 0), 0)
}

const columnOf = (id: ColumnId, items: DomainItem[]): ColumnView => {
  const total = totalOf(items)
  return {
    id,
    label: COLUMN_LABEL[id],
    items: items.map(itemView),
    total: total === null ? undefined : euro(total),
    empty: COLUMN_EMPTY[id],
  }
}

/** Les deux colonnes d'un domaine : ce qui est en place, puis ce qui est en préparation. */
export const columnsOf = (domain: DomainInfo): ColumnView[] => [columnOf('inPlace', domain.inPlace), columnOf('planned', domain.planned)]
