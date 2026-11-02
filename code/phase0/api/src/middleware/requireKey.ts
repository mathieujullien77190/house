// La clé secrète de l'utilisateur : dans l'en-tête X-House-Key (comparée en temps constant), ou la session
// ouverte avec elle (cookie signé de 30 jours), pour ce qu'une balise <img> ou <video> charge sans en-tête et pour
// une page rouverte sans qu'on ressaisisse la clé.
import { timingSafeEqual } from 'node:crypto'
import type { Request, RequestHandler } from 'express'
import type { Sessions } from './session.ts'

export const KEY_HEADER = 'x-house-key'

export const createKeyCheck = (apiKey: string) => {
  const expected = Buffer.from(apiKey)
  return (req: Request): boolean => {
    const given = Buffer.from(req.header(KEY_HEADER) ?? '')
    return given.length === expected.length && timingSafeEqual(given, expected)
  }
}

export const createRequireKey = (apiKey: string, sessions: Sessions): RequestHandler => {
  const hasKey = createKeyCheck(apiKey)
  return (req, res, next) => {
    if (hasKey(req) || sessions.has(req)) {
      next()
      return
    }
    res.status(401).json({ error: 'invalid key' })
  }
}
