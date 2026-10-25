// La session : un cookie posé par /auth (une balise <img> ne peut pas envoyer l'en-tête X-House-Key),
// un jeton aléatoire gardé en mémoire ; HttpOnly, Secure, SameSite=Lax, pas de durée (la session du navigateur).
import { randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'

export const SESSION_COOKIE = 'house_session'

const tokens = new Set<string>()

const cookieOf = (req: Request, name: string): string => {
  const pair = (req.headers.cookie ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  return pair ? pair.slice(name.length + 1) : ''
}

export const hasSession = (req: Request): boolean => tokens.has(cookieOf(req, SESSION_COOKIE))

export const openSession = (res: Response): void => {
  const token = randomBytes(24).toString('hex')
  tokens.add(token)
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`)
}

export const closeSession = (req: Request, res: Response): void => {
  tokens.delete(cookieOf(req, SESSION_COOKIE))
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0`)
}
