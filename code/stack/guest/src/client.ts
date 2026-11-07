// L'adresse du visiteur. En direct (maison, VPN, port redirigé), c'est celle de la connexion. Derrière Tailscale Funnel, la connexion vient du mini PC lui-même et
// l'adresse du visiteur est dans l'en-tête X-Forwarded-For que Funnel ajoute : on ne la croit que si la connexion vient du mini PC (un visiteur ne peut pas
// se faire passer pour quelqu'un d'autre), et on prend la dernière adresse de la liste (celle que Funnel a vue, pas une que le visiteur aurait écrite).
import { normalizeIp, originOf } from './visits.ts'

const ADDRESS = /^[0-9a-f:.]{2,45}$/i

export const clientIp = (remote: string, forwardedFor: string | string[] | undefined): string => {
  const peer = normalizeIp(remote)
  if (originOf(peer) !== 'mini PC') return peer
  const list = (Array.isArray(forwardedFor) ? forwardedFor.join(',') : (forwardedFor ?? '')).split(',').map((part) => part.trim())
  const last = list[list.length - 1] ?? ''
  return ADDRESS.test(last) ? normalizeIp(last) : peer
}
