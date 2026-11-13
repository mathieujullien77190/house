import type { BoxDevice, BoxGuest, BoxState } from '@/types'
import { formatTime } from '@/lib/format'
import { GUEST_ADMITTED, GUEST_EXCLUDED, GUEST_OFFLINE, GUEST_ONLINE, LEASE_DYNAMIC, LEASE_STATIC, UNKNOWN } from './constants'

/** « 6 j 14 h 34 min » : jours et heures n'apparaissent que s'il y en a. */
export const formatUptime = (seconds: number | null): string => {
  if (seconds === null) return UNKNOWN
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return [days > 0 ? `${days} j` : '', days > 0 || hours > 0 ? `${hours} h` : '', `${minutes} min`].filter(Boolean).join(' ')
}

/** Un débit en octets par seconde, écrit en mégabits par seconde (kb/s sous 1 Mb/s). */
export const formatRate = (bytesPerSecond: number | null): string => {
  if (bytesPerSecond === null) return UNKNOWN
  const bits = bytesPerSecond * 8
  return bits >= 1_000_000 ? `${(bits / 1_000_000).toFixed(1).replace('.', ',')} Mb/s` : `${Math.round(bits / 1000)} kb/s`
}

const STATE_TEXT: Record<string, string> = { up: 'En ligne', down: 'Coupée', going_up: 'Connexion…', going_down: 'Déconnexion…' }

/** « En ligne (ethernet) » : l'état de la ligne et son type. */
export const lineText = (connection: BoxState['connection']): string => {
  if (!connection?.state) return UNKNOWN
  const state = STATE_TEXT[connection.state] ?? connection.state
  return connection.type ? `${state} (${connection.type})` : state
}

/** Le bail DHCP en toutes lettres : IP fixe (réservée), dynamique, ou inconnu. */
export const leaseText = (staticLease: boolean | null): string => (staticLease === null ? UNKNOWN : staticLease ? LEASE_STATIC : LEASE_DYNAMIC)

/** Les appareils du réseau : ceux de la maison et ceux qui ont un bail DHCP statique, connectés ou non (le Freebox Player, souvent éteint, y reste), les baux statiques en premier (puis par nom). Un invité n'y figure pas : il est dans « Appareils invités ». */
export const listedDevices = (devices: BoxDevice[]): BoxDevice[] =>
  devices
    .filter((device) => device.staticLease === true || device.home === true || (device.home === undefined && device.active))
    .sort((a, b) => Number(b.staticLease === true) - Number(a.staticLease === true) || a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))

/** Les cellules de texte d'un invité (le type, en icône, s'intercale après l'adresse IP) : nom, MAC, adresse IP, première et dernière vue, état, exclu. */
export const guestCells = (guest: BoxGuest): string[] => [
  guest.name,
  guest.ip ?? UNKNOWN,
  formatTime(guest.firstSeen),
  formatTime(guest.lastSeen),
  guest.active ? GUEST_ONLINE : GUEST_OFFLINE,
  guest.excluded ? GUEST_EXCLUDED : GUEST_ADMITTED,
]
