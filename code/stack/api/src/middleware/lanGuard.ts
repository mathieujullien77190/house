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

/** Qui entre : la page des invités (`lan`, deux caméras) ou la télé (`tv`, toutes les caméras). */
export type LanScope = 'lan' | 'tv'

export interface LanGuardOptions {
  key: string
  /** La clé de la télé (TV_KEY) et ses jetons : facultatifs. */
  tvKey?: string
  tvTokens?: LanTokens
  prefixes: string[]
  tokens: LanTokens
  limiter?: AttemptLimiter
}

export const createLanGuard = ({ key, tvKey = '', tvTokens, prefixes, tokens, limiter = createAttemptLimiter() }: LanGuardOptions) => {
  const same = (given: string, wanted: string): boolean => {
    const bytes = Buffer.from(given)
    const expected = Buffer.from(wanted)
    return wanted.length >= MIN_LAN_KEY_LENGTH && bytes.length === expected.length && timingSafeEqual(bytes, expected)
  }
  return (allowToken = false): RequestHandler =>
    (req, res, next) => {
      if (key.length < MIN_LAN_KEY_LENGTH && tvKey.length < MIN_LAN_KEY_LENGTH) return void res.status(503).json({ error: 'page du réseau non configurée (LAN_KEY)' })
      const peer = req.socket.remoteAddress
      if (peer === undefined || !isLocalAddress(peer, prefixes)) return void res.status(403).json({ error: 'réseau local seulement' })
      const ip = peer
      // Le périmètre de l'appelant est posé pour la route : la télé voit toutes les caméras, les invités deux.
      if (allowToken && tokens.check(req.query.t)) {
        res.locals.lanScope = 'lan' satisfies LanScope
        return void next()
      }
      if (allowToken && tvTokens?.check(req.query.t)) {
        res.locals.lanScope = 'tv' satisfies LanScope
        return void next()
      }
      const given = req.header(LAN_KEY_HEADER) ?? ''
      // La bonne clé passe toujours (comme celle de la WebApp) : le blocage ne vise que les essais ratés.
      if (given !== '' && (same(given, key) || same(given, tvKey))) {
        res.locals.lanScope = (same(given, tvKey) ? 'tv' : 'lan') satisfies LanScope
        limiter.clear(ip)
        return void next()
      }
      if (given !== '' && limiter.isBlocked(ip)) return void res.status(429).json({ error: 'trop d’essais' })
      if (given !== '') limiter.fail(ip)
      res.status(401).json({ error: 'clé refusée' })
    }
}
