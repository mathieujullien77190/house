import { isCameraKind, type DiagramNode, type Floor, type LinkType, type NodeKind } from '@/nodes'

export const LINK_TYPE_LABEL: Record<LinkType, string> = {
  poe: 'Ethernet PoE',
  eth: 'Ethernet',
  power: 'Alimentation',
}

export const FLOOR_LABEL: Record<Floor, string> = {
  rdc: 'rez-de-chaussée',
  basement: 'sous-sol',
}

export const linkTypeLabel = (type: LinkType): string => LINK_TYPE_LABEL[type]

const BASE: Record<LinkType, string> = {
  poe: 'Câble RJ45 : données et alimentation (PoE 802.3af).',
  eth: 'Câble RJ45 : données (Ethernet).',
  power: 'Câble solaire : alimentation 12 V.',
}

/** Précision selon les deux extrémités de la liaison. */
const detail = (a: NodeKind, b: NodeKind): string => {
  const has = (k: NodeKind) => a === k || b === k
  if (has('zero') && has('switch')) return 'Le splitter PoE sépare le courant, l’adaptateur Ethernet USB-OTG amène les données au Pi Zero. Flux vidéo RTSP vers le cluster.'
  if ((isCameraKind(a) || isCameraKind(b)) && has('switch')) return 'Flux vidéo RTSP vers le cluster.'
  if (has('switch') && a === b) return 'Lien entre les deux switchs. Ils sont non administrables : pas de RSTP, donc un seul câble entre eux, sans boucle.'
  if (has('pi') && has('switch')) return 'Une des deux branches du bonding active-backup du Pi5.'
  if (has('backup') && has('switch')) return 'Reçoit les sauvegardes et le trafic du cluster k3s.'
  if (has('solar') && has('backup')) return 'Le régulateur MPPT et la batterie alimentent le Pi de sauvegarde.'
  return ''
}

export const describeLink = (a: DiagramNode, b: DiagramNode, type: LinkType): string => {
  return `${BASE[type]} ${detail(a.kind, b.kind)}`.trim()
}
