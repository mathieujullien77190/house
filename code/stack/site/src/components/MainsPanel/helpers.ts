import { MAINS_WATTS, isMainsNode, type DiagramNode } from '@/nodes'
import { DETAIL_BY_KIND } from './constants'
import type { MainsItem } from './types'

export const buildItems = (nodes: DiagramNode[]): MainsItem[] => {
  return nodes.filter(isMainsNode).map((n): MainsItem => ({
    id: n.id,
    label: n.title,
    detail: DETAIL_BY_KIND[n.kind] ?? (n.watts ? 'alimentation externe' : ''),
    watts: n.watts ?? MAINS_WATTS[n.kind] ?? null,
  }))
}

export const totalWatts = (items: MainsItem[]): number => items.reduce((s, i) => s + (i.watts ?? 0), 0)
