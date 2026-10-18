import { linkTypeFor, type DiagramLink, type DiagramNode, type Phase } from '@/nodes'

export interface WiringResult {
  links: DiagramLink[]
  /** Explication du branchement choisi (absente s'il n'y a pas de switch). */
  notice?: string
}

const sameZone = (a?: string, b?: string): boolean =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()

/** Phases communes à deux composants (vide s'ils n'existent jamais ensemble). */
const sharedPhases = (a: DiagramNode, b: DiagramNode): Phase[] => a.phases.filter((p) => b.phases.includes(p))

/**
 * Branche une caméra sur un switch en fonction de sa zone :
 * - zone déjà couverte par d'autres caméras : l'autre switch (redondance) ;
 * - sinon, ou si tous les switchs sont déjà pris : le switch le moins chargé.
 * Seuls les switchs présents dans toutes les phases de la caméra sont candidats.
 * Les anciens liens de la caméra vers un switch sont remplacés.
 */
export const autoWire = (nodes: DiagramNode[], links: DiagramLink[], cam: DiagramNode, makeId: () => string): WiringResult => {
  const allSwitches = nodes.filter((n) => n.kind === 'switch')
  const switches = allSwitches.filter((sw) => cam.phases.every((p) => sw.phases.includes(p)))
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
      { id: makeId(), from: cam.id, to: target.id, type: linkTypeFor(cam.kind, target.kind), phases: sharedPhases(cam, target) },
    ],
    notice,
  }
}

/**
 * Branche un composant d'infrastructure ajouté sans mode manuel :
 * - Pi5 : un lien vers chaque switch ;
 * - switch : un lien vers chaque Pi5 et vers le premier autre switch ;
 * - Pi de sauvegarde : un lien vers le switch le moins chargé.
 * Un lien n'existe que dans les phases communes aux deux composants.
 * Les autres types (panneau solaire, composant libre) restent sans lien.
 */
export const wireInfra = (nodes: DiagramNode[], links: DiagramLink[], node: DiagramNode, makeId: () => string): DiagramLink[] => {
  const others = nodes.filter((n) => n.id !== node.id)
  const switches = others.filter((n) => n.kind === 'switch')
  const make = (target: DiagramNode): DiagramLink[] => {
    const phases = sharedPhases(node, target)
    if (phases.length === 0) return []
    return [{ id: makeId(), from: node.id, to: target.id, type: linkTypeFor(node.kind, target.kind), phases }]
  }

  if (node.kind === 'pi') return [...links, ...switches.flatMap(make)]

  if (node.kind === 'switch') {
    const pis = others.filter((n) => n.kind === 'pi')
    return [...links, ...pis.flatMap(make), ...switches.slice(0, 1).flatMap(make)]
  }

  if (node.kind === 'backup') {
    const usable = switches.filter((sw) => sharedPhases(node, sw).length > 0)
    if (usable.length === 0) return links
    const load = (id: string) => links.filter((l) => l.from === id || l.to === id).length
    const target = usable.reduce((best, sw) => (load(sw.id) < load(best.id) ? sw : best))
    return [...links, ...make(target)]
  }

  return links
}
