import { MAINS_WATTS, isMainsNode, type DiagramNode, type Phase } from '@/nodes'
import { DETAIL_BY_KIND, UPS_ITEM } from './constants'
import type { MainsItem } from './types'

export const buildItems = (nodes: DiagramNode[], phase: Phase): MainsItem[] => {
  const devices = nodes.filter(isMainsNode).map((n): MainsItem => ({
    id: n.id,
    label: n.title,
    detail: DETAIL_BY_KIND[n.kind] ?? (n.watts ? 'alimentation externe' : ''),
    watts: n.watts ?? MAINS_WATTS[n.kind] ?? null,
  }))
  return phase === 2 ? [...devices, UPS_ITEM] : devices
}

export const totalWatts = (items: MainsItem[]): number => items.reduce((s, i) => s + (i.watts ?? 0), 0)
