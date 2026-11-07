// La clé secrète de l'utilisateur : dans l'en-tête X-House-Key (comparée en temps constant), ou la session
// ouverte avec elle (cookie signé de 30 jours), pour ce qu'une balise <img> ou <video> charge sans en-tête et pour
// une page rouverte sans qu'on ressaisisse la clé.
import { timingSafeEqual } from 'node:crypto'
import type { Request, RequestHandler } from 'express'
import { createAttemptLimiter, type AttemptLimiter } from '../lib/attemptLimiter.ts'
import type { Sessions } from './session.ts'

export const KEY_HEADER = 'x-house-key'

export const createKeyCheck = (apiKey: string) => {
  const expected = Buffer.from(apiKey)
  return (req: Request): boolean => {
    const given = Buffer.from(req.header(KEY_HEADER) ?? '')
    return given.length === expected.length && timingSafeEqual(given, expected)
  }
}

export const createRequireKey = (apiKey: string, sessions: Sessions, limiter: AttemptLimiter = createAttemptLimiter()): RequestHandler => {
  const hasKey = createKeyCheck(apiKey)
  return (req, res, next) => {
    if (sessions.has(req)) {
      next()
      return
    }
    const ip = req.ip ?? ''
    // Un en-tête vide est la page qui essaie son cookie : ce n'est pas un essai de clé.
    const tried = (req.header(KEY_HEADER) ?? '') !== ''
    // La bonne clé passe toujours (même depuis une adresse bloquée, que partagent le VPN ou la box) : le blocage ne vise que les essais ratés.
    if (hasKey(req)) {
      limiter.clear(ip)
      next()
      return
    }
    if (tried && limiter.isBlocked(ip)) {
      res.status(429).json({ error: 'too many attempts' })
      return
    }
    if (tried) limiter.fail(ip)
    res.status(401).json({ error: 'invalid key' })
  }
}
