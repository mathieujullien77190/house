import { linkTypeFor, type DiagramLink, type DiagramNode } from '@/nodes'

export interface WiringResult {
  links: DiagramLink[]
  /** Explication du branchement choisi (absente s'il n'y a pas de switch). */
  notice?: string
}

const sameZone = (a?: string, b?: string): boolean =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Branche une caméra sur un switch en fonction de sa zone :
 * - zone déjà couverte par d'autres caméras : l'autre switch (redondance) ;
 * - sinon, ou si tous les switchs sont déjà pris : le switch le moins chargé.
 * Les anciens liens de la caméra vers un switch sont remplacés.
 */
export const autoWire = (nodes: DiagramNode[], links: DiagramLink[], cam: DiagramNode, makeId: () => string): WiringResult => {
  const allSwitches = nodes.filter((n) => n.kind === 'switch')
  const switches = allSwitches
  if (switches.length === 0) return { links }

  const isSwitch = (id: string) => allSwitches.some((sw) => sw.id === id)
  const otherEnd = (l: DiagramLink, id: string) => (l.from === id ? l.to : l.to === id ? l.from : null)

  const kept = links.filter((l) => {
    const other = otherEnd(l, cam.id)
    return !(other && isSwitch(other))
  })

  const peers = nodes.filter((n) => n.id !== cam.id && n.kind === cam.kind && sameZone(n.zone, cam.zone))
  const used = new Set<string>()
  for (const peer of peers) {
    for (const l of kept) {
      const other = otherEnd(l, peer.id)
      if (other && isSwitch(other)) used.add(other)
    }
  }

  const free = switches.filter((sw) => !used.has(sw.id))
  const candidates = free.length > 0 ? free : switches
  const load = (id: string) => kept.filter((l) => l.from === id || l.to === id).length
  const target = candidates.reduce((best, sw) => (load(sw.id) < load(best.id) ? sw : best))

  const zone = cam.zone?.trim() ? `« ${cam.zone.trim()} »` : 'sans zone'
  const notice =
    peers.length > 0 && free.length > 0
      ? `Zone ${zone} déjà couverte : branchée sur « ${target.title} », l’autre switch, pour la redondance.`
      : peers.length > 0
        ? `Zone ${zone} : tous les switchs sont déjà utilisés, branchée sur « ${target.title} » (le moins chargé).`
        : `Nouvelle zone ${zone} : branchée sur « ${target.title} » (le moins chargé).`

  return {
    links: [
      ...kept,
      { id: makeId(), from: cam.id, to: target.id, type: linkTypeFor(cam.kind, target.kind) },
    ],
    notice,
  }
}
