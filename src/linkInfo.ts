import { isCameraKind, type DiagramNode, type Floor, type LinkType, type NodeKind } from '@/nodes'

export const LINK_TYPE_LABEL: Record<LinkType, string> = {
  poe: 'Ethernet PoE',
  eth: 'Ethernet',
  wifi: 'WiFi',
  usb: 'USB',
  vpn: 'VPN WireGuard',
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
  usb: 'Câble USB 3 : le disque dur externe, alimenté par le mini PC.',
  vpn: 'Tunnel WireGuard : le téléphone, en 4G ou sur un autre Wi-Fi, rejoint le réseau de la maison par le serveur VPN de la Freebox.',
}

/** Précision selon les deux extrémités de la liaison. */
const detail = (a: NodeKind, b: NodeKind): string => {
  const has = (k: NodeKind) => a === k || b === k
  if ((isCameraKind(a) || isCameraKind(b)) && has('switch')) return 'Flux vidéo RTSP vers le mini PC.'
  if (has('switch') && a === b) return 'Lien entre les deux switchs. Un seul câble entre eux, sans boucle : ce modèle n’a pas de RSTP.'
  if (has('disk')) return 'Reçoit les clips copiés et la base SQLite de House Sync ; l’API les lit de là.'
  if (has('switch') && has('custom')) return 'Le switch est relié à la box : internet, et le téléphone joint la WebApp par le WiFi de la box.'
  if (has('phone')) return 'Le téléphone joint le mini PC par la box pour ouvrir les applications.'
  return ''
}

export const describeLink = (a: DiagramNode, b: DiagramNode, type: LinkType): string => {
  const ids = [a.id, b.id]
  if (ids.includes('mini') && ids.includes('swA')) return 'Câble RJ45 : le mini PC reçoit les flux RTSP des caméras (go2rtc), les enregistre (motion), puis sert la WebApp, l’API et House Sync.'
  if (ids.includes('remote') && ids.includes('box')) return 'Tunnel WireGuard : le téléphone se connecte à la box depuis l’extérieur (port UDP du serveur VPN de la Freebox), reçoit une adresse du réseau 192.168.27.0/24, puis atteint le mini PC (WebApp 8080, House Sync 8081) comme s’il était à la maison. Le pare-feu du mini PC n’ouvre ces ports qu’au réseau de la maison et à ce réseau VPN ; rien n’est redirigé sur la Freebox.'
  return `${BASE[type]} ${detail(a.kind, b.kind)}`.trim()
}
