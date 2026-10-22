// Catalogue de prix. « repo » = prix relevés dans docs/schema-electronique.md du dépôt
// mathieujullien77190/birds ; « estimation » = ordre de grandeur, à confirmer avant achat.
import { inPhase, type DiagramNode, type NodeKind, type Phase } from './nodes'

export type Source = 'repo' | 'estimation' | 'perso'
export type Group = 'Caméras' | 'Réseau' | 'Raspberry Pi' | 'Divers'

export interface Counts {
  reolink: number
  zeros: number
  switches: number
  pis: number
}

export interface Line {
  id: string
  group: Group
  label: string
  unit: number
  qty: number
  source: Source
  note?: string
  /** Phases où la ligne s'applique (toutes si absent). */
  phases?: Phase[]
  /** Si défini, la quantité se règle avec +/− dans le tableau. */
  editable?: keyof Counts
}

/** Type de composant du schéma qui correspond à chaque compteur. */
export const countKind: Record<keyof Counts, NodeKind> = {
  reolink: 'camera',
  zeros: 'zero',
  switches: 'switch',
  pis: 'pi',
}

export const countsOf = (nodes: DiagramNode[]): Counts => {
  const n = (k: NodeKind) => nodes.filter((x) => x.kind === k).length
  return { reolink: n('camera'), zeros: n('zero'), switches: n('switch'), pis: n('pi') }
}

export const PORTS_PER_SWITCH = 8
/** Ports PoE par switch : les caméras ne se branchent que sur ceux-là (ES208GP : 8 ports PoE+). */
export const POE_PORTS_PER_SWITCH = 8

/** Pi de sauvegarde : absent de la version light (phase 0). */
const backupCount = (phase: Phase): number => (phase === 0 ? 0 : 1)

/**
 * Ports nécessaires : caméras PoE, liens des Pi (un seul par Pi avec un switch, deux — A et B — avec deux),
 * 1 pour le Pi de sauvegarde, 2 pour le lien entre les deux switchs.
 */
export const portsNeeded = (c: Counts, phase: Phase = 2): number => {
  const two = c.switches >= 2
  return c.reolink + c.zeros + (two ? 2 : 1) * c.pis + backupCount(phase) + (two ? 2 : 0)
}

export const buildLines = (c: Counts, customs: DiagramNode[] = [], phase: Phase = 2): Line[] => {
  const backups = backupCount(phase)
  // Câbles : un par port utilisé, le lien entre switchs n'en compte qu'un.
  const rj45 = portsNeeded(c, phase) - (c.switches >= 2 ? 1 : 0)
  const lines: Line[] = [
    { id: 'reolink', group: 'Caméras', label: 'Reolink RLC-810A 4K PoE (objectif 4 mm)', unit: 74.5, qty: c.reolink, source: 'perso', editable: 'reolink', note: 'lot de 2 à 149 € ; 12 W max, 802.3af' },
    { id: 'zero', group: 'Caméras', label: 'Raspberry Pi Zero 2 W (mini-cam)', unit: 17, qty: c.zeros, source: 'estimation', editable: 'zeros' },
    { id: 'zero-cam', group: 'Caméras', label: 'Camera Module 3 NoIR 75°', unit: 34.9, qty: c.zeros, source: 'repo' },
    { id: 'zero-ribbon', group: 'Caméras', label: 'Nappe caméra 22 → 15 broches, 200 mm', unit: 1.32, qty: c.zeros, source: 'repo' },
    { id: 'zero-sd', group: 'Caméras', label: 'Carte microSD 16 Go', unit: 8, qty: c.zeros, source: 'estimation' },
    { id: 'zero-poe', group: 'Caméras', label: 'Splitter PoE 802.3af → 5 V 2 A + sortie RJ45 données', unit: 12, qty: c.zeros, source: 'estimation' },
    { id: 'zero-eth', group: 'Caméras', label: 'Adaptateur Ethernet USB-OTG (micro-USB → RJ45) + cordon court', unit: 10, qty: c.zeros, source: 'estimation' },
    { id: 'zero-box', group: 'Caméras', label: 'Boîtier étanche (ou impression 3D)', unit: 10, qty: c.zeros, source: 'estimation' },

    { id: 'switch', group: 'Réseau', label: 'Switch PoE Gigabit 8 ports TP-Link Omada ES208GP', unit: 69.99, qty: c.switches, source: 'perso', editable: 'switches', note: '8 ports PoE+, budget PoE 64 W, administrable (Omada) : PoE coupable port par port' },
    { id: 'rj45', group: 'Réseau', label: 'Câbles RJ45 Cat6 (calculés)', unit: 3, qty: rj45, source: 'estimation', note: 'caméras PoE + 2 par Pi + backup + lien entre switchs' },
    { id: 'ups', group: 'Réseau', label: 'Onduleur (switchs + Pi5)', unit: 80, qty: 1, source: 'estimation', note: 'optionnel mais conseillé', phases: [2] },

    { id: 'pi', group: 'Raspberry Pi', label: 'Raspberry Pi 5 (2 Go)', unit: 76.8, qty: c.pis + backups, source: 'repo', editable: 'pis', note: 'Kubii ; la version 4 Go coûte plus cher' },
    { id: 'pi-psu', group: 'Raspberry Pi', label: 'Alimentation officielle 27 W USB-C', unit: 12.9, qty: c.pis + backups, source: 'repo' },
    { id: 'pi-cooler', group: 'Raspberry Pi', label: 'Active Cooler officiel', unit: 6, qty: c.pis + backups, source: 'repo' },
    { id: 'pi-sd', group: 'Raspberry Pi', label: 'Carte microSD 256 Go', unit: 45, qty: c.pis, source: 'perso', phases: [1, 2] },
    { id: 'pi-sd-backup', group: 'Raspberry Pi', label: 'Carte microSD 1 To', unit: 108, qty: 1, source: 'perso', phases: [1, 2] },

    { id: 'misc', group: 'Divers', label: 'Coffret IP65, visserie, gaines, bornes Wago', unit: 40, qty: 1, source: 'estimation', phases: [1, 2] },
    ...customs.map((n): Line => ({ id: n.id, group: 'Divers', label: n.title, unit: n.price ?? 0, qty: 1, source: 'perso', note: 'composant ajouté au schéma' })),
  ]
  return lines.filter((l) => !l.phases || l.phases.includes(phase))
}

export const groups: Group[] = ['Caméras', 'Réseau', 'Raspberry Pi', 'Divers']

export const euro = (n: number): string =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export interface Warning {
  id: string
  text: string
}

export const warnings = (c: Counts, phase: Phase = 2): Warning[] => {
  const out: Warning[] = []
  const capacity = c.switches * PORTS_PER_SWITCH
  const needed = portsNeeded(c, phase)
  if (needed > capacity) {
    out.push({ id: 'ports', text: `${needed} ports nécessaires pour ${capacity} disponibles : ajoute un switch ou retire des éléments.` })
  }
  if (c.reolink + c.zeros > c.switches * POE_PORTS_PER_SWITCH) {
    out.push({ id: 'poe-ports', text: `${c.reolink + c.zeros} caméras PoE pour ${c.switches * POE_PORTS_PER_SWITCH} ports PoE (8 par switch) : ajoute un switch.` })
  }
  if (c.switches < 2 && phase === 2) out.push({ id: 'redundancy', text: 'Un seul switch : plus de redondance réseau.' })
  // Le Pi de sauvegarde est le 3ᵉ nœud control-plane du cluster.
  if (phase !== 0 && c.pis + 1 < 3) out.push({ id: 'quorum', text: 'Moins de 3 nœuds k3s (Pi5 + Pi de sauvegarde) : pas de quorum etcd pour un cluster en haute disponibilité.' })
  return out
}

/** Total du budget pour une phase, calculé sur les composants présents dans cette phase. */
export const totalFor = (nodes: DiagramNode[], phase: Phase): number => {
  const visible = nodes.filter((n) => inPhase(n, phase))
  const lines = buildLines(countsOf(visible), visible.filter((n) => n.kind === 'custom'), phase)
  return lines.reduce((sum, l) => sum + l.unit * l.qty, 0)
}
