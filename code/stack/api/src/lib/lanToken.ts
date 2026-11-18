// Le jeton court des images de la page invité du réseau : une balise <img> ne peut pas envoyer l'en-tête de la clé, et la clé ne doit jamais être dans une adresse (elle finirait dans les journaux).
// La page échange sa clé (`GET /lan/token`, en-tête) contre un jeton `<expiration>.<signature>` de 60 s, signé (HMAC-SHA256) avec la clé : il ne vaut que pour `/lan/stream` et `/lan/frame`,
// et seulement à l'ouverture (un flux déjà ouvert continue).
import { createHmac, timingSafeEqual } from 'node:crypto'

export const TOKEN_SECONDS = 60

export interface LanTokens {
  issue: () => string
  check: (token: unknown) => boolean
}

export const createLanTokens = (key: string, now: () => number = Date.now): LanTokens => {
  const sign = (expires: string): string => createHmac('sha256', key).update(`lan-image:${expires}`).digest('hex')
  return {
    issue: () => {
      const expires = String(Math.floor(now() / 1000) + TOKEN_SECONDS)
      return `${expires}.${sign(expires)}`
    },
    check: (token) => {
      if (typeof token !== 'string') return false
      const [expires, signature] = token.split('.')
      if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < Math.floor(now() / 1000)) return false
      const expected = Buffer.from(sign(expires))
      const given = Buffer.from(signature)
      return given.length === expected.length && timingSafeEqual(given, expected)
    },
  }
}
