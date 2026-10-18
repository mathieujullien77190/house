import { isK3sKind, type DiagramLink, type DiagramNode } from './nodes'

type Side = 'top' | 'bottom' | 'left' | 'right'
interface Pt { x: number; y: number }
interface Anchor { p: Pt; side: Side }
export interface LinkGeometry { d: string }

const NORMAL: Record<Side, Pt> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const cx = (n: DiagramNode) => n.x + n.w / 2
const cy = (n: DiagramNode) => n.y + n.h / 2

/** Côté de `a` qui regarde `b`. */
const sideFacing = (a: DiagramNode, b: DiagramNode): Side => {
  const dx = cx(b) - cx(a)
  const dy = cy(b) - cy(a)
  const vertical = Math.abs(dy) / (a.h + b.h) >= Math.abs(dx) / (a.w + b.w)
  if (vertical) return dy >= 0 ? 'bottom' : 'top'
  return dx >= 0 ? 'right' : 'left'
}

/**
 * Calcule le tracé de chaque lien. Quand plusieurs liens arrivent sur le même côté
 * d'un composant, ils sont répartis le long de ce côté, triés selon la position de l'autre bout.
 */
export const computeLinkPaths = (nodes: DiagramNode[], links: DiagramLink[]): Record<string, LinkGeometry> => {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  interface Entry { linkId: string; end: 'a' | 'b'; node: DiagramNode; side: Side; key: number }
  const groups = new Map<string, Entry[]>()
  const valid: DiagramLink[] = []

  for (const l of links) {
    const a = byId.get(l.from)
    const b = byId.get(l.to)
    if (!a || !b) continue
    valid.push(l)
    for (const [end, node, other] of [['a', a, b], ['b', b, a]] as const) {
      const side = sideFacing(node, other)
      const key = side === 'top' || side === 'bottom' ? cx(other) : cy(other)
      const gk = `${node.id}:${side}`
      const list = groups.get(gk) ?? []
      list.push({ linkId: l.id, end, node, side, key })
      groups.set(gk, list)
    }
  }

  const anchors = new Map<string, Anchor>()
  for (const list of groups.values()) {
    list.sort((p, q) => p.key - q.key || p.linkId.localeCompare(q.linkId))
    list.forEach((e, i) => {
      const t = (i + 1) / (list.length + 1)
      const { node, side } = e
      const p: Pt =
        side === 'top' ? { x: node.x + t * node.w, y: node.y }
        : side === 'bottom' ? { x: node.x + t * node.w, y: node.y + node.h }
        : side === 'left' ? { x: node.x, y: node.y + t * node.h }
        : { x: node.x + node.w, y: node.y + t * node.h }
      anchors.set(`${e.linkId}:${e.end}`, { p, side })
    })
  }

  const out: Record<string, LinkGeometry> = {}
  for (const l of valid) {
    const a = anchors.get(`${l.id}:a`)
    const b = anchors.get(`${l.id}:b`)
    if (!a || !b) continue
    const dist = Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y)
    const off = Math.max(30, dist / 2.5)
    const c1 = { x: a.p.x + NORMAL[a.side].x * off, y: a.p.y + NORMAL[a.side].y * off }
    const c2 = { x: b.p.x + NORMAL[b.side].x * off, y: b.p.y + NORMAL[b.side].y * off }
    out[l.id] = { d: `M ${a.p.x} ${a.p.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.p.x} ${b.p.y}` }
  }
  return out
}

/** Rectangle englobant les nœuds k3s (cadre du cluster), ou null s'il n'y en a pas. */
export const clusterBox = (nodes: DiagramNode[]): { x: number; y: number; w: number; h: number } | null => {
  const pis = nodes.filter((n) => isK3sKind(n.kind))
  if (pis.length === 0) return null
  const x1 = Math.min(...pis.map((n) => n.x)) - 14
  const y1 = Math.min(...pis.map((n) => n.y)) - 22
  const x2 = Math.max(...pis.map((n) => n.x + n.w)) + 14
  const y2 = Math.max(...pis.map((n) => n.y + n.h)) + 10
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}
