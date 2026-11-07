import type { GuestInfo } from '@/types'

/** Le lien de la page invité, clé comprise : l'adresse publique réglée dans l'API si elle existe, sinon la page du mini PC (le même hôte que la WebApp, le port de la page invité). */
export const guestLink = (info: GuestInfo, host: string): string => {
  const url = new URL(info.url || `https://${host}:${info.port}/`)
  url.searchParams.set('k', info.key)
  return url.toString()
}
