// Modèle du schéma : types, modèles de composants (templates) et schéma par défaut.
export type NodeKind = 'camera' | 'switch' | 'pi' | 'backup' | 'phone' | 'custom' | 'disk'
export type LinkType = 'poe' | 'eth' | 'wifi' | 'usb'
/** Étage où se trouve un composant : rez-de-chaussée (maison et jardin) ou sous-sol. */
export type Floor = 'rdc' | 'basement'
/**
 * Phase de déploiement : 0 = version light (2 Reolink, 1 switch PoE, ton PC qui enregistre), 1 = un mini PC neuf et un
 * disque dur externe (la même pile Docker Compose), 2 = installation complète. Les phases 0 et 1 sont des scénarios à part,
 * sans cluster k3s.
 */
export type Phase = 0 | 1 | 2

export interface DiagramNode {
  id: string
  x: number
  y: number
  w: number
  h: number
  kind: NodeKind
  floor: Floor
  /** Phases où le composant est présent. */
  phases: Phase[]
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
  /** Phases où le lien existe (la topologie change entre les phases). */
  phases: Phase[]
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

export const inPhase = (item: { phases: Phase[] }, phase: Phase): boolean => item.phases.includes(phase)

/** Composants dont le prix se saisit à la main : les composants libres et le disque dur externe. */
export const isPricedByHand = (k: NodeKind): boolean => k === 'custom' || k === 'disk'

export const isCameraKind = (k: NodeKind): boolean => k === 'camera'

/** Nœuds du cluster k3s : les Pi5 et le Pi de sauvegarde (control-plane sans applications). */
export const isK3sKind = (k: NodeKind): boolean => k === 'pi' || k === 'backup'

/** Composants branchés directement sur une prise 230 V (les caméras PoE passent par les switchs). */
export const isMainsKind = (k: NodeKind): boolean => k === 'switch' || k === 'pi' || k === 'backup'

/** Un composant branché au secteur : un type qui l'est toujours, ou un composant libre qui déclare sa puissance. */
export const isMainsNode = (n: DiagramNode): boolean => isMainsKind(n.kind) || (n.watts ?? 0) > 0

/** Puissance maximale estimée par composant branché au secteur, en watts. */
export const MAINS_WATTS: Partial<Record<NodeKind, number>> = {
  switch: 64, // budget PoE du TP-Link Omada ES208GP, caméras comprises
  pi: 27, // alimentation officielle USB-C 27 W
  backup: 27, // idem, sur le secteur comme les Pi5
}

/** Plan commun aux deux étages : le jardin et la maison tiennent dans ce cadre. */
export const CANVAS = { w: 900, h: 540 }

export const templates: Record<NodeKind, Template> = {
  camera: { label: 'Reolink', w: 92, h: 36, floor: 'rdc', title: 'Reolink', sub: 'Caméra PoE' },
  switch: { label: 'Switch PoE', w: 120, h: 38, floor: 'basement', title: 'Switch PoE', sub: 'Alimente les caméras' },
  pi: { label: 'Pi5', w: 108, h: 46, floor: 'basement', title: 'Pi5', sub: 'worker' },
  backup: { label: 'Pi backup', w: 108, h: 46, floor: 'rdc', title: 'Pi backup', sub: 'k3s · sauvegarde' },
  phone: { label: 'Téléphone', w: 44, h: 72, floor: 'rdc', title: 'Téléphone', sub: 'WiFi' },
  disk: { label: 'Disque dur externe', w: 108, h: 36, floor: 'rdc', title: 'Disque dur', sub: 'USB · clips + base' },
  custom: { label: 'Composant libre', w: 96, h: 36, floor: 'rdc', title: 'Composant', sub: 'Personnalisé' },
}

const node = (id: string, kind: NodeKind, x: number, y: number, extra: Partial<DiagramNode> = {}): DiagramNode => {
  const t = templates[kind]
  return { id, x, y, w: t.w, h: t.h, kind, floor: t.floor, phases: [1, 2], title: t.title, sub: t.sub, ...extra }
}

/**
 * Schéma de départ, posé sur le plan de la maison (voir plan.ts), en trois phases.
 * - Phase 0, version light : 2 Reolink 4K vers le portail, 1 switch PoE, le PC de la maison (enregistrement sur son disque).
 * - Phase 1 : un mini PC neuf (BOSGAME E5) fait tourner tous les conteneurs, 2 Reolink vers le portail, 1 switch,
 *   1 disque dur externe en USB pour les clips et la base.
 * - Phase 2, l'installation complète : cluster k3s (2 Pi5 et le Pi de sauvegarde), 2 switchs, 2 Reolink au portail.
 * Rez-de-chaussée : 2 Reolink au portail, 1 switch, 1 Pi5 et le Pi de sauvegarde dans le salon.
 * Sous-sol : 1 Pi5 et le 2ᵉ switch.
 */
export const defaultNodes: DiagramNode[] = [
  node('cam1', 'camera', 40, 205, { title: 'Reolink 1', zone: 'Portail', phases: [0, 1, 2] }),
  node('cam2', 'camera', 40, 300, { title: 'Reolink 2', zone: 'Portail', phases: [0, 1, 2] }),

  node('swA', 'switch', 440, 335, { title: 'Switch PoE A', floor: 'rdc', phases: [0, 1, 2] }),
  node('swB', 'switch', 460, 175, { title: 'Switch PoE B', phases: [2] }),

  node('pi1', 'pi', 600, 335, { title: 'Pi5 #1', sub: 'control-plane + worker', floor: 'rdc', phases: [2] }),
  // Phase 1 : un mini PC neuf (299 €) fait tourner toute la pile, avec un SSD externe en USB pour les clips et la base.
  node('mini', 'custom', 590, 335, { title: 'Mini PC', sub: 'BOSGAME E5 · Docker', floor: 'rdc', phases: [1], w: 130, price: 299, watts: 65 }),
  node('ssd', 'disk', 600, 392, { title: 'SSD Verbatim 1 To', phases: [1], w: 130, price: 129 }),
  // Phase 0 : le PC existant (déjà possédé, prix 0) fait l'enregistrement à la place du Pi5.
  node('pc', 'custom', 600, 335, { title: 'PC', sub: 'enregistre le RTSP', floor: 'rdc', phases: [0], price: 0 }),
  // Phase 0 : la box (internet) et le téléphone qui ouvre l'appli sur le PC, déjà possédés (prix 0).
  node('box', 'custom', 600, 292, { title: 'Box', sub: 'internet', floor: 'rdc', phases: [0, 1], price: 0 }),
  node('phone', 'phone', 300, 428, { sub: 'ouvre l’appli', phases: [0, 1] }),
  node('pi2', 'pi', 320, 130, { title: 'Pi5 #2', sub: 'control-plane + worker', phases: [2] }),

  node('bak', 'backup', 440, 270, { phases: [2] }),
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

const link = (from: string, to: string, type: LinkType, phases: Phase[] = [1, 2]): DiagramLink => ({
  id: `${from}-${to}`,
  from,
  to,
  type,
  phases,
})

export const defaultLinks: DiagramLink[] = [
  link('cam1', 'swA', 'poe', [0, 1, 2]),
  link('cam2', 'swA', 'poe', [0, 1]),
  // Phase 0 : le PC enregistre, relié à la box.
  link('swA', 'pc', 'eth', [0]),
  link('pc', 'box', 'eth', [0]),
  link('phone', 'box', 'wifi', [0, 1]),
  // Phase 1 : tout sur l'unique switch, relié à la box ; le disque est en USB sur le mini PC.
  link('swA', 'mini', 'eth', [1]),
  link('swA', 'box', 'eth', [1]),
  link('mini', 'ssd', 'usb', [1]),
  // Phase 2 : cluster k3s, second switch, caméras du portail réparties sur les deux switchs.
  link('swA', 'pi1', 'eth', [2]),
  link('swA', 'pi2', 'eth', [2]),
  link('cam2', 'swB', 'poe', [2]),
  link('swA', 'swB', 'eth', [2]),
  link('swB', 'pi1', 'eth', [2]),
  link('swB', 'pi2', 'eth', [2]),
  link('swB', 'bak', 'eth', [2]),
]
