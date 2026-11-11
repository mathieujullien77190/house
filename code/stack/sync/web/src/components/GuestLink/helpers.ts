import type { GuestLinkInfo } from '@/lib/api'

/** Le lien de la page invité, clé comprise : l'adresse publique si elle existe, sinon la page du mini PC (le même hôte que House Sync, le port de la page invité). */
export const guestLink = (info: GuestLinkInfo, host: string): string => {
  const url = new URL(info.url || `https://${host}:${info.port}/`)
  url.searchParams.set('k', info.key)
  return url.toString()
}
