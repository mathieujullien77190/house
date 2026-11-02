// Modèle du schéma : types, modèles de composants (templates) et schéma par défaut : l'état actuel du système.
export type NodeKind = 'camera' | 'switch' | 'phone' | 'custom' | 'disk'
/** `vpn` : le tunnel WireGuard de la Freebox, qui amène un téléphone de l'extérieur sur le réseau de la maison. */
export type LinkType = 'poe' | 'eth' | 'wifi' | 'usb' | 'vpn'
/** Étage où se trouve un composant : rez-de-chaussée (maison et jardin) ou sous-sol. */
export type Floor = 'rdc' | 'basement'

export interface DiagramNode {
  id: string
  x: number
  y: number
  w: number
  h: number
  kind: NodeKind
  floor: Floor
  title: string
  sub: string
  /** Prix saisi à la main, utilisé seulement pour les composants libres. */
  price?: number
  /** Puissance maximale au secteur, en watts, d'un composant libre branché sur une prise 230 V (le mini PC). */
  watts?: number
  /** Zone surveillée (caméras seulement), ex. « Portail ». */
  zone?: string
}

export interface DiagramLink {
  id: string
  from: string
  to: string
  type: LinkType
}

export interface Template {
  label: string
  w: number
  h: number
  /** Étage où le composant est posé par défaut. */
  floor: Floor
  title: string
  sub: string
}

/** Composants dont le prix se saisit à la main : les composants libres et le disque dur externe. */
export const isPricedByHand = (k: NodeKind): boolean => k === 'custom' || k === 'disk'

export const isCameraKind = (k: NodeKind): boolean => k === 'camera'

/** Composants branchés directement sur une prise 230 V (les caméras PoE passent par le switch). */
export const isMainsKind = (k: NodeKind): boolean => k === 'switch'

/** Un composant branché au secteur : un type qui l'est toujours, ou un composant libre qui déclare sa puissance. */
export const isMainsNode = (n: DiagramNode): boolean => isMainsKind(n.kind) || (n.watts ?? 0) > 0

/** Puissance maximale estimée par composant branché au secteur, en watts. */
export const MAINS_WATTS: Partial<Record<NodeKind, number>> = {
  switch: 64, // budget PoE du TP-Link Omada ES208GP, caméras comprises
}

/** Plan commun aux deux étages : le jardin et la maison tiennent dans ce cadre. */
export const CANVAS = { w: 900, h: 540 }

export const templates: Record<NodeKind, Template> = {
  camera: { label: 'Reolink', w: 92, h: 36, floor: 'rdc', title: 'Reolink', sub: 'Caméra PoE' },
  switch: { label: 'Switch PoE', w: 120, h: 38, floor: 'basement', title: 'Switch PoE', sub: 'Alimente les caméras' },
  phone: { label: 'Téléphone', w: 44, h: 72, floor: 'rdc', title: 'Téléphone', sub: 'WiFi' },
  disk: { label: 'Disque dur externe', w: 108, h: 36, floor: 'rdc', title: 'Disque dur', sub: 'USB · clips + base' },
  custom: { label: 'Composant libre', w: 96, h: 36, floor: 'rdc', title: 'Composant', sub: 'Personnalisé' },
}

const node = (id: string, kind: NodeKind, x: number, y: number, extra: Partial<DiagramNode> = {}): DiagramNode => {
  const t = templates[kind]
  return { id, x, y, w: t.w, h: t.h, kind, floor: t.floor, title: t.title, sub: t.sub, ...extra }
}

/**
 * Schéma de départ, posé sur le plan de la maison (voir plan.ts) : l'état actuel du système.
 * Rez-de-chaussée : 2 Reolink au portail, le switch PoE, le mini PC (ACEMAGIC K1, SSD de 1 To, toute la pile Docker),
 * la box (internet et serveur VPN WireGuard), le téléphone qui ouvre les applications par le WiFi de la box, et, hors de
 * la maison (en haut à droite du jardin), le téléphone en 4G qui arrive par le tunnel WireGuard.
 */
export const defaultNodes: DiagramNode[] = [
  node('cam1', 'camera', 40, 205, { title: 'Reolink 1', zone: 'Portail' }),
  node('cam2', 'camera', 40, 300, { title: 'Reolink 2', zone: 'Portail' }),

  node('swA', 'switch', 440, 335, { title: 'Switch PoE', floor: 'rdc' }),
  // Le mini PC (479 €) fait tourner toute la pile ; son SSD de 1 To garde les clips et la base.
  node('mini', 'custom', 590, 335, { title: 'Mini PC', sub: 'ACEMAGIC K1 · 1 To · Docker', floor: 'rdc', w: 130, price: 479, watts: 65 }),
  // La box (internet, serveur VPN WireGuard) et le téléphone qui ouvre les applications : déjà possédés (prix 0).
  node('box', 'custom', 600, 292, { title: 'Box', sub: 'internet · VPN WireGuard', floor: 'rdc', w: 130, price: 0 }),
  node('phone', 'phone', 300, 428, { sub: 'ouvre les applis' }),
  node('remote', 'phone', 790, 40, { title: 'Téléphone 4G', sub: 'hors de la maison' }),
]

/** Type de lien déduit des deux extrémités. */
export const linkTypeFor = (a: NodeKind, b: NodeKind): LinkType => {
  const kinds = [a, b]
  if (kinds.some(isCameraKind) && kinds.includes('switch')) return 'poe'
  if (kinds.includes('phone')) return 'wifi'
  // Un disque dur externe se branche en USB sur le mini PC (composant ‹ ssd ›).
  if (kinds.includes('disk')) return 'usb'
  return 'eth'
}

const link = (from: string, to: string, type: LinkType): DiagramLink => ({ id: `${from}-${to}`, from, to, type })

export const defaultLinks: DiagramLink[] = [
  link('cam1', 'swA', 'poe'),
  link('cam2', 'swA', 'poe'),
  // Tout sur l'unique switch, relié à la box ; les clips sont sur le SSD interne du mini PC.
  link('swA', 'mini', 'eth'),
  link('swA', 'box', 'eth'),
  link('phone', 'box', 'wifi'),
  // L'accès distant : le téléphone en 4G entre par le tunnel WireGuard de la box, puis atteint le mini PC.
  link('remote', 'box', 'vpn'),
]
