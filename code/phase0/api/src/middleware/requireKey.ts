// La clé secrète de l'utilisateur, dans l'en-tête X-House-Key, comparée en temps constant.
import { timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'

export const KEY_HEADER = 'x-house-key'

export const createRequireKey = (apiKey: string): RequestHandler => {
  const expected = Buffer.from(apiKey)
  return (req, res, next) => {
    const given = req.header(KEY_HEADER) ?? ''
    const buffer = Buffer.from(given)
    if (buffer.length === expected.length && timingSafeEqual(buffer, expected)) {
      next()
      return
    }
    res.status(401).json({ error: 'invalid key' })
  }
}
