// La session : un cookie posé par /auth (une balise <img> ne peut pas envoyer l'en-tête X-House-Key). Le jeton porte sa
// date de fin et une signature (HMAC) calculée avec la clé : l'API ne garde rien en mémoire, la session survit à un
// redémarrage, dure 30 jours (renouvelés à chaque /auth) et tous les jetons cessent de valoir si la clé change.
// Le cookie est HttpOnly (le JavaScript de la page ne le lit pas), Secure et SameSite=Lax.
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Request, Response } from 'express'

export const SESSION_COOKIE = 'house_session'
export const SESSION_SECONDS = 30 * 24 * 60 * 60

const sign = (apiKey: string, expires: number): string => createHmac('sha256', apiKey).update(`house-session:${expires}`).digest('hex')

/** Un jeton valable jusqu'à `now + SESSION_SECONDS` (secondes). */
export const createToken = (apiKey: string, now: number): string => {
  const expires = now + SESSION_SECONDS
  return `${expires}.${sign(apiKey, expires)}`
}

/** Le jeton est-il signé avec cette clé et pas encore expiré ? */
export const isValidToken = (apiKey: string, token: string, now: number): boolean => {
  const [expiresText = '', mac = ''] = token.split('.')
  const expires = Number(expiresText)
  if (!Number.isInteger(expires) || expires <= now || !mac) return false
  const expected = Buffer.from(sign(apiKey, expires))
  const given = Buffer.from(mac)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

const cookieOf = (req: Request, name: string): string => {
  const pair = (req.headers.cookie ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  return pair ? pair.slice(name.length + 1) : ''
}

const nowSeconds = (): number => Math.floor(Date.now() / 1000)

export const createSessions = (apiKey: string) => ({
  has: (req: Request): boolean => isValidToken(apiKey, cookieOf(req, SESSION_COOKIE), nowSeconds()),
  open: (res: Response): void => {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${createToken(apiKey, nowSeconds())}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`)
  },
  close: (res: Response): void => {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`)
  },
})

export type Sessions = ReturnType<typeof createSessions>
