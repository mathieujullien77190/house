import { isCameraKind, type DiagramNode, type Floor, type LinkType, type NodeKind } from '@/nodes'

export const LINK_TYPE_LABEL: Record<LinkType, string> = {
  poe: 'Ethernet PoE',
  eth: 'Ethernet',
  wifi: 'WiFi',
  usb: 'USB',
}

export const FLOOR_LABEL: Record<Floor, string> = {
  rdc: 'rez-de-chaussée',
  basement: 'sous-sol',
}

export const linkTypeLabel = (type: LinkType): string => LINK_TYPE_LABEL[type]

const BASE: Record<LinkType, string> = {
  poe: 'Câble RJ45 : données et alimentation (PoE 802.3af).',
  eth: 'Câble RJ45 : données (Ethernet).',
  wifi: 'Liaison sans fil (WiFi) : aucun câble.',
  usb: 'Câble USB 3 : le disque dur externe, alimenté par le Pi.',
}

/** Précision selon les deux extrémités de la liaison. */
const detail = (a: NodeKind, b: NodeKind): string => {
  const has = (k: NodeKind) => a === k || b === k
  if ((isCameraKind(a) || isCameraKind(b)) && has('switch')) return 'Flux vidéo RTSP vers le cluster.'
  if (has('switch') && a === b) return 'Lien entre les deux switchs. Un seul câble entre eux, sans boucle : ce modèle n’a pas de RSTP.'
  if (has('pi') && has('switch')) return 'Une des deux branches du bonding active-backup du Pi5.'
  if (has('disk')) return 'Reçoit les clips copiés et la base SQLite de House Sync ; l’API les lit de là.'
  if (has('switch') && has('custom')) return 'Le switch est relié à la box : internet, et le téléphone joint la WebApp par le WiFi de la box.'
  if (has('backup') && has('switch')) return 'Reçoit les sauvegardes et le trafic du cluster k3s.'
  if (has('phone')) return 'Le téléphone joint le PC par la box pour ouvrir l’appli.'
  return ''
}

export const describeLink = (a: DiagramNode, b: DiagramNode, type: LinkType): string => {
  const ids = [a.id, b.id]
  if (ids.includes('rec') && ids.includes('swA')) return 'Câble RJ45 : le Pi 1 reçoit les flux RTSP des caméras (go2rtc) et les enregistre (motion) ; House Sync, sur le Pi 2, vient chercher les clips.'
  if (ids.includes('hub') && ids.includes('swA')) return 'Câble RJ45 : le Pi 2 interroge l’enregistreur du Pi 1 (House Sync) et relaie son direct (API).'
  if (ids.includes('pc') && ids.includes('box')) return 'Câble RJ45 ou WiFi : seconde carte réseau du PC vers la box (internet, et accès depuis le téléphone).'
  if (ids.includes('pc') && ids.includes('swA')) return 'Câble RJ45 : carte réseau 1 du PC, réseau des caméras (IP fixes). Le PC lit les flux RTSP.'
  return `${BASE[type]} ${detail(a.kind, b.kind)}`.trim()
}
