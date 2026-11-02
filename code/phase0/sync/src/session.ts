// La session de la page : un cookie posé après la saisie de la clé. Le jeton porte sa date de fin et une signature
// (HMAC) calculée avec la clé : House Sync ne garde rien en mémoire, la session survit à un redémarrage, dure 30 jours
// (renouvelés à chaque connexion) et tous les jetons cessent de valoir si la clé change.
// Le cookie est HttpOnly (le JavaScript de la page ne le lit pas), Secure et SameSite=Lax.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_SECONDS = 30 * 24 * 60 * 60

const sign = (key: string, expires: number): string => createHmac('sha256', key).update(`house-sync-session:${expires}`).digest('hex')

/** Un jeton valable jusqu'à `now + SESSION_SECONDS` (secondes). */
export const createToken = (key: string, now: number): string => {
  const expires = now + SESSION_SECONDS
  return `${expires}.${sign(key, expires)}`
}

/** Le jeton est-il signé avec cette clé et pas encore expiré ? */
export const isValidToken = (key: string, token: string, now: number): boolean => {
  const [expiresText = '', mac = ''] = token.split('.')
  const expires = Number(expiresText)
  if (!Number.isInteger(expires) || expires <= now || !mac) return false
  const expected = Buffer.from(sign(key, expires))
  const given = Buffer.from(mac)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** L'en-tête Set-Cookie qui ouvre la session (token) ou la ferme (token vide). */
export const sessionCookie = (name: string, token: string): string =>
  token
    ? `${name}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`
    : `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
