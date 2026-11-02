// Catalogue de prix. « repo » = prix relevés dans docs/schema-electronique.md du dépôt
// mathieujullien77190/birds ; « estimation » = ordre de grandeur, à confirmer avant achat.
import { isPricedByHand, type DiagramNode, type NodeKind } from './nodes'

export type Source = 'repo' | 'estimation' | 'perso'
export type Group = 'Caméras' | 'Réseau' | 'Divers'

export interface Counts {
  reolink: number
  switches: number
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
  /** Si défini, la quantité se règle avec +/− dans le tableau. */
  editable?: keyof Counts
}

/** Type de composant du schéma qui correspond à chaque compteur. */
export const countKind: Record<keyof Counts, NodeKind> = {
  reolink: 'camera',
  switches: 'switch',
}

export const countsOf = (nodes: DiagramNode[]): Counts => {
  const n = (k: NodeKind) => nodes.filter((x) => x.kind === k).length
  return { reolink: n('camera'), switches: n('switch') }
}

const REOLINK_PRICE = 74.5
const SWITCH_PRICE = 69.99
const SSD_URL = 'https://www.kubii.com/fr/support-de-stockage/3058-1469-disque-dur-ssd-verbatim-vi550-3272496311510.html'
const MINI_URL = 'https://www.amazon.fr/dp/B0GJC1K9HD'
const ADAPTER_URL = 'https://www.kubii.com/fr/hub-cables-adaptateurs/3151-adaptateur-usb-vers-sata-3272496304642.html'

export const PORTS_PER_SWITCH = 8
/** Ports PoE par switch : les caméras ne se branchent que sur ceux-là (ES208GP : 8 ports PoE+). */
export const POE_PORTS_PER_SWITCH = 8

/** Ports nécessaires : les caméras PoE, 2 pour le mini PC et le lien vers la box, 2 de plus pour le lien entre deux switchs. */
export const portsNeeded = (c: Counts): number => c.reolink + 2 + (c.switches >= 2 ? 2 : 0)

export const buildLines = (c: Counts, customs: DiagramNode[] = []): Line[] => {
  const lines: Line[] = [
    { id: 'reolink', group: 'Caméras', label: 'Reolink RLC-810A 4K PoE (objectif 4 mm)', unit: REOLINK_PRICE, qty: c.reolink, source: 'perso', note: 'lot de 2 à 149 € ; 12 W max, 802.3af' },

    { id: 'switch', group: 'Réseau', label: 'Switch PoE Gigabit 8 ports TP-Link Omada ES208GP', unit: SWITCH_PRICE, qty: c.switches, source: 'perso', note: '8 ports PoE+, budget PoE 64 W, administrable (Omada) : PoE coupable port par port' },
    // Un rouleau de 100 m d'Ethernet d'extérieur pour les caméras.
    { id: 'rj45-100m', group: 'Réseau', label: 'deleyCON câble d’installation extérieur Cat6, 100 m (cuivre rigide, étanche)', unit: 84.26, qty: 1, source: 'perso', note: 'Amazon : le rouleau pour les caméras du portail, jardin et extérieur, 1000 Mbit/s', url: 'https://www.amazon.fr/dp/B0GX68JQNN' },

    // Le mini PC (479 €, SSD M.2 de 1 To pour les clips et la base). Un disque externe reste ajoutable à la main.
    ...customs.filter((n) => (n.price ?? 0) > 0).map((n): Line => ({
      id: n.id,
      group: 'Divers',
      label: n.title,
      unit: n.price ?? 0,
      qty: 1,
      source: 'perso',
      note: n.kind === 'disk' ? 'Kubii, SATA III 2,5" : clips et base du mini PC ; 480 To d’endurance annoncée' : n.id === 'mini' ? 'ACEMAGIC K1 : Ryzen 5 7530U (6 cœurs, 15 W), 16 Go, SSD M.2 1 To, Ethernet 1 Gb/s (clips et base) ; Docker Compose' : 'composant ajouté au schéma',
      url: n.kind === 'disk' ? SSD_URL : n.id === 'mini' ? MINI_URL : undefined,
    })),
    { id: 'disk-adapter', group: 'Divers', label: 'Adaptateur USB 3.0 / SATA 2,5"', unit: 6.95, qty: customs.filter((n) => n.kind === 'disk').length, source: 'perso', note: 'Kubii : branche le SSD sur un port USB 3 du mini PC', url: ADAPTER_URL },
  ]
  // Rien n'est grisé : une ligne à zéro disparaît, sauf un compteur réglable (pour pouvoir l'ajouter).
  return lines.filter((l) => l.qty > 0 || !!l.editable)
}

export const groups: Group[] = ['Caméras', 'Réseau', 'Divers']

export const euro = (n: number): string =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export interface Warning {
  id: string
  text: string
}

export const warnings = (c: Counts): Warning[] => {
  const out: Warning[] = []
  const capacity = c.switches * PORTS_PER_SWITCH
  const needed = portsNeeded(c)
  if (needed > capacity) {
    out.push({ id: 'ports', text: `${needed} ports nécessaires pour ${capacity} disponibles : retire des éléments.` })
  }
  if (c.reolink > c.switches * POE_PORTS_PER_SWITCH) {
    out.push({ id: 'poe-ports', text: `${c.reolink} caméras PoE pour ${c.switches * POE_PORTS_PER_SWITCH} ports PoE (8 par switch) : retire des caméras.` })
  }
  return out
}

/** Total du budget : tout ce que le système compte aujourd'hui. */
export const total = (nodes: DiagramNode[]): number => {
  const lines = buildLines(countsOf(nodes), nodes.filter((n) => isPricedByHand(n.kind)))
  return lines.reduce((sum, l) => sum + l.unit * l.qty, 0)
}
