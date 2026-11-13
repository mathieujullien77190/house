import type { SelectOption } from '@/components/UI/Select'
import { FLOOR_LABEL, LINK_TYPE_LABEL, describeLink } from '@/linkInfo'
import { linkClass } from '@/lib/linkStyles'
import type { DiagramLink, DiagramNode } from '@/nodes'
import { NO_ZONE_OPTION, ZONES } from './constants'
import type { InfoPanelMode, LinkItem } from './types'

export const panelMode = (node: DiagramNode | null, link: DiagramLink | null): InfoPanelMode => {
  if (node) return 'node'
  if (link) return 'link'
  return 'empty'
}

const titleOf = (nodes: DiagramNode[], id: string): string => nodes.find((n) => n.id === id)?.title ?? '?'

export const linkLabel = (nodes: DiagramNode[], link: DiagramLink | null): string => {
  if (!link) return ''
  return `${titleOf(nodes, link.from)} ↔ ${titleOf(nodes, link.to)}`
}

export const linkDescription = (nodes: DiagramNode[], link: DiagramLink | null): string => {
  if (!link) return ''
  const a = nodes.find((n) => n.id === link.from)
  const b = nodes.find((n) => n.id === link.to)
  return a && b ? describeLink(a, b, link.type) : ''
}

/** Liens d'un composant, avec le composant d'en face et une description. */
export const buildLinkItems = (node: DiagramNode | null, links: DiagramLink[], nodes: DiagramNode[]): LinkItem[] => {
  if (!node) return []
  return links.flatMap((l): LinkItem[] => {
    if (l.from !== node.id && l.to !== node.id) return []
    const other = nodes.find((n) => n.id === (l.from === node.id ? l.to : l.from))
    if (!other) return []
    return [{
      id: l.id,
      otherTitle: other.title,
      otherFloor: other.floor !== node.floor ? FLOOR_LABEL[other.floor] : undefined,
      type: l.type,
      typeLabel: LINK_TYPE_LABEL[l.type],
      description: describeLink(node, other, l.type),
      swatchClass: linkClass(l.type),
    }]
  })
}

export const parsePrice = (raw: string): number => Math.max(0, Number(raw) || 0)

/** Zones proposées, plus la zone actuelle si elle n'est pas dans la liste. */
export const zoneOptions = (current?: string): SelectOption[] => {
  const zones = current && !ZONES.includes(current) ? [...ZONES, current] : ZONES
  return [NO_ZONE_OPTION, ...zones.map((z) => ({ value: z, label: z }))]
}
