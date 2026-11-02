// Les erreurs des routes : la base pas encore créée donne 503, le reste 500 (sans détail au client).
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { DatabaseNotReady } from '../db/database.ts'

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'not found' })
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof DatabaseNotReady) {
    res.status(503).json({ error: 'database not ready' })
    return
  }
  console.error(error instanceof Error ? error.message : String(error))
  res.status(500).json({ error: 'internal error' })
}
