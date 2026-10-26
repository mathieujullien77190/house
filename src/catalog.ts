// Catalogue de prix. « repo » = prix relevés dans docs/schema-electronique.md du dépôt
// mathieujullien77190/birds ; « estimation » = ordre de grandeur, à confirmer avant achat.
import { inPhase, isPricedByHand, type DiagramNode, type NodeKind, type Phase } from './nodes'

export type Source = 'repo' | 'estimation' | 'perso'
export type Group = 'Caméras' | 'Réseau' | 'Raspberry Pi' | 'Divers'

export interface Counts {
  reolink: number
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
  /** Page du produit chez le revendeur, si on la connaît. */
  url?: string
  /** Phases où la ligne s'applique (toutes si absent). */
  phases?: Phase[]
  /** Si défini, la quantité se règle avec +/− dans le tableau. */
  editable?: keyof Counts
}

/** Type de composant du schéma qui correspond à chaque compteur. */
export const countKind: Record<keyof Counts, NodeKind> = {
  reolink: 'camera',
  switches: 'switch',
  pis: 'pi',
}

export const countsOf = (nodes: DiagramNode[]): Counts => {
  const n = (k: NodeKind) => nodes.filter((x) => x.kind === k).length
  return { reolink: n('camera'), switches: n('switch'), pis: n('pi') }
}

const REOLINK_PRICE = 74.5
const SWITCH_PRICE = 69.99
const CABLE_PRICE = 3
const SSD_URL = 'https://www.kubii.com/fr/support-de-stockage/3058-1469-disque-dur-ssd-verbatim-vi550-3272496311510.html'
const ADAPTER_URL = 'https://www.kubii.com/fr/hub-cables-adaptateurs/3151-adaptateur-usb-vers-sata-3272496304642.html'

export const PORTS_PER_SWITCH = 8
/** Ports PoE par switch : les caméras ne se branchent que sur ceux-là (ES208GP : 8 ports PoE+). */
export const POE_PORTS_PER_SWITCH = 8

/** Pi de sauvegarde : seulement dans le cluster k3s de la phase 2 (les phases 0 et 1 n'ont pas de cluster). */
const backupCount = (phase: Phase): number => (phase === 2 ? 1 : 0)

/**
 * Ports nécessaires : caméras PoE, liens des Pi (un seul par Pi avec un switch, deux — A et B — avec deux),
 * 1 pour le Pi de sauvegarde, 2 pour le lien entre les deux switchs, et en phase 1 2 pour le mini PC et le lien vers la box.
 */
export const portsNeeded = (c: Counts, phase: Phase = 2): number => {
  const two = c.switches >= 2
  return c.reolink + (two ? 2 : 1) * c.pis + backupCount(phase) + (two ? 2 : 0) + (phase === 1 ? 2 : 0)
}

/**
 * `owned` : ce qui est déjà acheté pour la phase 0 et resservira en phase 1 (les Reolink, le switch et leurs câbles) ;
 * la phase 1 ne le recompte pas : elle ne liste que les achats nouveaux.
 */
export const buildLines = (c: Counts, customs: DiagramNode[] = [], phase: Phase = 2, owned: Counts | null = null): Line[] => {
  const have = owned ?? { reolink: 0, switches: 0, pis: 0 }
  const backups = backupCount(phase)
  // Câbles : un par port utilisé, le lien entre switchs n'en compte qu'un.
  const rj45 = portsNeeded(c, phase) - (c.switches >= 2 ? 1 : 0)
  const lines: Line[] = [
    { id: 'reolink', group: 'Caméras', label: 'Reolink RLC-810A 4K PoE (objectif 4 mm)', unit: REOLINK_PRICE, qty: Math.max(0, c.reolink - have.reolink), source: 'perso', editable: 'reolink', note: 'lot de 2 à 149 € ; 12 W max, 802.3af' },

    { id: 'switch', group: 'Réseau', label: 'Switch PoE Gigabit 8 ports TP-Link Omada ES208GP', unit: SWITCH_PRICE, qty: Math.max(0, c.switches - have.switches), source: 'perso', editable: 'switches', note: '8 ports PoE+, budget PoE 64 W, administrable (Omada) : PoE coupable port par port' },
    { id: 'rj45', group: 'Réseau', label: 'Câbles RJ45 Cat6 (calculés)', unit: CABLE_PRICE, qty: rj45, source: 'estimation', note: 'caméras PoE + Pi + backup + lien entre switchs ou vers la box', phases: [0, 2] },
    // Phase 1 : trois câbles de 2 m (mini PC, box, un de plus), plus les câbles des caméras (plus longs, calculés).
    { id: 'rj45-2m', group: 'Réseau', label: 'Câble Ethernet Cat6 Gigabit RJ45 Vention, 2 m', unit: 2.97, qty: 3, source: 'perso', note: 'Kubii : mini PC, lien vers la box, 1 de plus', url: 'https://www.kubii.com/fr/hub-cables-adaptateurs/4253-cable-reseau-ethernet-cat6-gigabit-rj45-vention-3272496317505.html', phases: [1] },
    { id: 'rj45-cam', group: 'Réseau', label: 'Câbles RJ45 Cat6 vers les caméras (calculés)', unit: CABLE_PRICE, qty: Math.max(0, c.reolink - have.reolink), source: 'estimation', note: 'un par caméra PoE de plus, longueur selon le trajet', phases: [1] },
    { id: 'ups', group: 'Réseau', label: 'Onduleur (switchs + Pi5)', unit: 80, qty: 1, source: 'estimation', note: 'optionnel mais conseillé', phases: [2] },

    { id: 'pi', group: 'Raspberry Pi', label: 'Raspberry Pi 5 (2 Go)', unit: 76.8, qty: c.pis + backups, source: 'repo', editable: 'pis', note: 'Kubii', phases: [0, 2] },
    { id: 'pi-psu', group: 'Raspberry Pi', label: 'Alimentation officielle 27 W USB-C', unit: 12.9, qty: c.pis + backups, source: 'repo', url: 'https://www.kubii.com/fr/alimentations/4107-1890-alimentation-raspberry-pi-27w-usb-c-3272496315761.html' },
    { id: 'pi-cooler', group: 'Raspberry Pi', label: 'Active Cooler officiel', unit: 6, qty: c.pis + backups, source: 'repo', phases: [0, 2] },
    { id: 'pi-sd', group: 'Raspberry Pi', label: 'Carte microSD Verbatim 256 Go (classe 10)', unit: 36.95, qty: c.pis, source: 'perso', note: 'Kubii', url: 'https://www.kubii.com/fr/support-de-stockage/3061-1475-carte-micro-sdhc-verbatim-classe-10-3272496311527.html', phases: [2] },
    { id: 'pi-sd-backup', group: 'Raspberry Pi', label: 'Carte microSD 1 To', unit: 108, qty: 1, source: 'perso', phases: [2] },

    // Phase 1 : le mini PC (299 €) et le SSD externe (clips et base), branché en USB 3 avec un adaptateur SATA.
    ...customs.filter((n) => (n.price ?? 0) > 0).map((n): Line => ({
      id: n.id,
      group: 'Divers',
      label: n.title,
      unit: n.price ?? 0,
      qty: 1,
      source: 'perso',
      note: n.kind === 'disk' ? 'Kubii, SATA III 2,5" : clips et base du mini PC ; 480 To d’endurance annoncée' : n.id === 'mini' ? 'BOSGAME E5 : Ryzen 3 5300U, 16 Go, SSD NVMe 512 Go, 2 ports 2,5 Gb/s ; Docker Compose' : 'composant ajouté au schéma',
      url: n.kind === 'disk' ? SSD_URL : undefined,
    })),
    { id: 'disk-adapter', group: 'Divers', label: 'Adaptateur USB 3.0 / SATA 2,5"', unit: 6.95, qty: customs.filter((n) => n.kind === 'disk').length, source: 'perso', note: 'Kubii : branche le SSD sur un port USB 3 du mini PC', url: ADAPTER_URL, phases: [1] },
  ]
  // Rien n'est grisé : une ligne à zéro disparaît, sauf un compteur réglable qui n'est pas déjà acheté (pour pouvoir l'ajouter).
  const alreadyOwned = (l: Line) => !!l.editable && !!owned && have[l.editable] > 0
  return lines.filter((l) => (!l.phases || l.phases.includes(phase)) && (l.qty > 0 || (!!l.editable && !alreadyOwned(l))))
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
  if (c.reolink > c.switches * POE_PORTS_PER_SWITCH) {
    out.push({ id: 'poe-ports', text: `${c.reolink} caméras PoE pour ${c.switches * POE_PORTS_PER_SWITCH} ports PoE (8 par switch) : ajoute un switch.` })
  }
  if (c.switches < 2 && phase === 2) out.push({ id: 'redundancy', text: 'Un seul switch : plus de redondance réseau.' })
  // Le Pi de sauvegarde est le 3ᵉ nœud control-plane du cluster : seulement en phase 2.
  if (phase === 2 && c.pis + 1 < 3) out.push({ id: 'quorum', text: 'Moins de 3 nœuds k3s (Pi5 + Pi de sauvegarde) : pas de quorum etcd pour un cluster en haute disponibilité.' })
  return out
}

/** Les composants d'une phase qui existent déjà dans une phase précédente : elle ne les recompte pas. */
export const ownedFor = (nodes: DiagramNode[], phase: Phase): Counts | null =>
  phase === 0 ? null : countsOf(nodes.filter((n) => inPhase(n, phase) && n.phases.some((p) => p < phase)))

/** Ce que coûtent les composants déjà achetés dans une phase précédente (Reolink, switch, un câble par caméra) : le « avec » du total. */
export const creditFor = (nodes: DiagramNode[], phase: Phase): number => {
  const owned = ownedFor(nodes, phase)
  return owned ? owned.reolink * (REOLINK_PRICE + CABLE_PRICE) + owned.switches * SWITCH_PRICE : 0
}

/** Total du budget pour une phase, calculé sur les composants présents dans cette phase (sans compter la phase 0 pour la phase 1). */
export const totalFor = (nodes: DiagramNode[], phase: Phase): number => {
  const visible = nodes.filter((n) => inPhase(n, phase))
  const lines = buildLines(countsOf(visible), visible.filter((n) => isPricedByHand(n.kind)), phase, ownedFor(nodes, phase))
  return lines.reduce((sum, l) => sum + l.unit * l.qty, 0)
}
