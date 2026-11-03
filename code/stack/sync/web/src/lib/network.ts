import type { SpecItem } from '@house/ui'
import type { NetworkInterface } from '@/types'
import { formatSize } from './format'

const KIND_LABEL = { ethernet: 'RJ45', wifi: 'WiFi' } as const

/** Le débit négocié, lisible : 1000 Mb/s → « 1 Gb/s ». */
export const formatSpeed = (mbps: number): string => (mbps >= 1000 ? `${mbps / 1000} Gb/s` : `${mbps} Mb/s`)

/** L'état d'une carte en quelques mots : « Connecté · 1 Gb/s full duplex », « Non connecté », « Éteint ». */
export const linkState = (link: NetworkInterface): string => {
  if (link.kind === 'ethernet') {
    if (link.connected === false) return 'Câble débranché'
    return ['Connecté', link.speedMbps ? formatSpeed(link.speedMbps) : '', link.duplex ? `${link.duplex} duplex` : ''].filter(Boolean).join(' · ')
  }
  if (!link.up) return link.connected === false ? 'Non connecté' : 'Éteint'
  return ['Connecté', link.speedMbps ? formatSpeed(link.speedMbps) : '', link.signalDbm !== null ? `${link.signalDbm} dBm` : ''].filter(Boolean).join(' · ')
}

/** Les lignes de la liste du réseau : une par carte, avec son état, son adresse MAC et le trafic depuis le démarrage. */
export const buildLinkItems = (links: NetworkInterface[]): SpecItem[] =>
  links.map((link) => ({
    id: link.name,
    label: `${KIND_LABEL[link.kind]} (${link.name})`,
    value: [linkState(link), link.mac, `↓ ${formatSize(link.rxBytes)} · ↑ ${formatSize(link.txBytes)}`].filter(Boolean).join(' · '),
  }))

/** Le résumé à côté du titre : « RJ45 connecté · WiFi non connecté ». */
export const linkSummary = (links: NetworkInterface[]): string =>
  links.map((link) => `${KIND_LABEL[link.kind]} ${linkState(link).split(' · ')[0].toLowerCase()}`).join(' · ')
