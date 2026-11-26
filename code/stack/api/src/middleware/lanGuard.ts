// La garde des routes `/lan` : (1) le réseau local seulement (adresse de la connexion TCP, voir `lib/lanNetwork.ts`), puis (2) la clé de la page (en-tête X-Lan-Key, comparée en temps constant),
// sauf pour les images (`allowToken`), qui peuvent porter un jeton court (`?t=`, voir `lib/lanToken.ts`). Sans LAN_KEY (absente ou de moins de 16 caractères) : 503. Une clé fausse : 401 ;
// trop d'essais ratés depuis une adresse : 429 (le même limiteur que la clé de la WebApp).
import { timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { createAttemptLimiter, type AttemptLimiter } from '../lib/attemptLimiter.ts'
import { isLocalAddress } from '../lib/lanNetwork.ts'
import type { LanTokens } from '../lib/lanToken.ts'

export const LAN_KEY_HEADER = 'x-lan-key'
export const MIN_LAN_KEY_LENGTH = 16

export interface LanGuardOptions {
  key: string
  prefixes: string[]
  tokens: LanTokens
  limiter?: AttemptLimiter
}

export const createLanGuard = ({ key, prefixes, tokens, limiter = createAttemptLimiter() }: LanGuardOptions) => {
  const expected = Buffer.from(key)
  const hasKey = (given: string): boolean => {
    const bytes = Buffer.from(given)
    return bytes.length === expected.length && timingSafeEqual(bytes, expected)
  }
  return (allowToken = false): RequestHandler =>
    (req, res, next) => {
      if (key.length < MIN_LAN_KEY_LENGTH) return void res.status(503).json({ error: 'page du réseau non configurée (LAN_KEY)' })
      const peer = req.socket.remoteAddress
      if (peer === undefined || !isLocalAddress(peer, prefixes)) return void res.status(403).json({ error: 'réseau local seulement' })
      const ip = peer
      if (allowToken && tokens.check(req.query.t)) return void next()
      const given = req.header(LAN_KEY_HEADER) ?? ''
      // La bonne clé passe toujours (comme celle de la WebApp) : le blocage ne vise que les essais ratés.
      if (given !== '' && hasKey(given)) {
        limiter.clear(ip)
        return void next()
      }
      if (given !== '' && limiter.isBlocked(ip)) return void res.status(429).json({ error: 'trop d’essais' })
      if (given !== '') limiter.fail(ip)
      res.status(401).json({ error: 'clé refusée' })
    }
}
