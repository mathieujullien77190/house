// Modèle du schéma : types, modèles de composants (templates) et schéma par défaut.
export type NodeKind = 'camera' | 'zero' | 'switch' | 'pi' | 'backup' | 'phone' | 'custom'
export type LinkType = 'poe' | 'eth' | 'wifi'
/** Étage où se trouve un composant : rez-de-chaussée (maison et jardin) ou sous-sol. */
export type Floor = 'rdc' | 'basement'
/**
 * Phase de déploiement : 0 = version light (1 Reolink, 1 switch PoE, ton PC qui enregistre), 1 = strict minimum
 * (3 Pi, 1 switch, 2 mini-cams), 2 = installation complète. La phase 0 est un scénario à part.
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

export const isCameraKind = (k: NodeKind): boolean => k === 'camera' || k === 'zero'

/** Nœuds du cluster k3s : les Pi5 et le Pi de sauvegarde (control-plane sans applications). */
export const isK3sKind = (k: NodeKind): boolean => k === 'pi' || k === 'backup'

/** Composants branchés directement sur une prise 230 V (les caméras PoE passent par les switchs). */
export const isMainsKind = (k: NodeKind): boolean => k === 'switch' || k === 'pi' || k === 'backup'

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
  zero: { label: 'Mini-cam Pi Zero', w: 100, h: 36, floor: 'rdc', title: 'Mini-cam', sub: 'Pi Zero 2 W' },
  switch: { label: 'Switch PoE', w: 120, h: 38, floor: 'basement', title: 'Switch PoE', sub: 'Alimente les caméras' },
  pi: { label: 'Pi5', w: 108, h: 46, floor: 'basement', title: 'Pi5', sub: 'worker' },
  backup: { label: 'Pi backup', w: 108, h: 46, floor: 'rdc', title: 'Pi backup', sub: 'k3s · sauvegarde' },
  phone: { label: 'Téléphone', w: 44, h: 72, floor: 'rdc', title: 'Téléphone', sub: 'WiFi' },
  custom: { label: 'Composant libre', w: 96, h: 36, floor: 'rdc', title: 'Composant', sub: 'Personnalisé' },
}

const node = (id: string, kind: NodeKind, x: number, y: number, extra: Partial<DiagramNode> = {}): DiagramNode => {
  const t = templates[kind]
  return { id, x, y, w: t.w, h: t.h, kind, floor: t.floor, phases: [1, 2], title: t.title, sub: t.sub, ...extra }
}

/**
 * Schéma de départ, posé sur le plan de la maison (voir plan.ts), en trois phases.
 * - Phase 0, version light : 1 Reolink 4K vers le portail, 1 switch PoE, le PC de la maison (enregistrement sur son disque).
 * - Phase 1, le strict minimum : 3 Pi (2 Pi5 et le Pi de sauvegarde), 1 switch, 2 mini-cams Pi Zero.
 * - Phase 2, l'installation complète : + 2ᵉ switch, 2 Reolink vers le portail.
 * Rez-de-chaussée : mini-cams dans le nichoir, 1 switch, 1 Pi5 et le Pi de sauvegarde dans le salon.
 * Sous-sol : 1 Pi5 (et le 2ᵉ switch en phase 2).
 */
export const defaultNodes: DiagramNode[] = [
  node('cam1', 'camera', 40, 205, { title: 'Reolink 1', zone: 'Portail', phases: [0, 2] }),
  node('cam2', 'camera', 40, 300, { title: 'Reolink 2', zone: 'Portail', phases: [2] }),
  node('zero1', 'zero', 765, 92, { title: 'Mini-cam 1', zone: 'Nichoir' }),
  node('zero2', 'zero', 765, 140, { title: 'Mini-cam 2', zone: 'Nichoir' }),

  node('swA', 'switch', 440, 335, { title: 'Switch PoE A', floor: 'rdc', phases: [0, 1, 2] }),
  node('swB', 'switch', 460, 175, { title: 'Switch PoE B', phases: [2] }),

  node('pi1', 'pi', 600, 335, { title: 'Pi5 #1', sub: 'control-plane + worker', floor: 'rdc', phases: [1, 2] }),
  // Phase 0 : le PC existant (déjà possédé, prix 0) fait l'enregistrement à la place du Pi5.
  node('pc', 'custom', 600, 335, { title: 'PC', sub: 'enregistre le RTSP', floor: 'rdc', phases: [0], price: 0 }),
  // Phase 0 : la box (internet) et le téléphone qui ouvre l'appli sur le PC, déjà possédés (prix 0).
  node('box', 'custom', 600, 292, { title: 'Box', sub: 'internet', floor: 'rdc', phases: [0], price: 0 }),
  node('phone', 'phone', 300, 428, { sub: 'ouvre l’appli', phases: [0] }),
  node('pi2', 'pi', 320, 130, { title: 'Pi5 #2', sub: 'control-plane + worker' }),

  node('bak', 'backup', 440, 270),
]

/** Type de lien déduit des deux extrémités. */
export const linkTypeFor = (a: NodeKind, b: NodeKind): LinkType => {
  const kinds = [a, b]
  if (kinds.some(isCameraKind) && kinds.includes('switch')) return 'poe'
  if (kinds.includes('phone')) return 'wifi'
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
  // Phases 0 et 1 : tout est branché sur l'unique switch.
  link('cam1', 'swA', 'poe', [0, 2]),
  link('swA', 'pc', 'eth', [0]),
  link('pc', 'box', 'eth', [0]),
  link('phone', 'box', 'wifi', [0]),
  link('zero1', 'swA', 'poe', [1]),
  link('zero2', 'swA', 'poe'),
  link('swA', 'pi1', 'eth', [1, 2]),
  link('swA', 'pi2', 'eth'),
  link('swA', 'bak', 'eth', [1]),
  // Phase 2 : second switch, caméras du portail, répartition sur les deux switchs.
  link('cam2', 'swB', 'poe', [2]),
  link('zero1', 'swB', 'poe', [2]),
  link('swA', 'swB', 'eth', [2]),
  link('swB', 'pi1', 'eth', [2]),
  link('swB', 'pi2', 'eth', [2]),
  link('swB', 'bak', 'eth', [2]),
]
