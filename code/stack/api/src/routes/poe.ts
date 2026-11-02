// poe : l'état de l'alimentation de chaque caméra (GET) et son changement (POST /poe/:camera, corps {"on": true|false}).
// Sans switch configuré (SWITCH_PASSWORD absent), le service répond 503.
import express, { Router } from 'express'
import type { PoeService } from '../services/poeService.ts'
import { UnknownCamera } from '../services/poeService.ts'

export const poeRouter = (poe: PoeService | null): Router => {
  const router = Router()
  router.get('/poe', async (_req, res, next) => {
    if (!poe) return void res.status(503).json({ error: 'switch not configured' })
    try {
      res.json(await poe.list())
    } catch (error) {
      next(error)
    }
  })
  router.post('/poe/:camera', express.json({ limit: '1kb' }), async (req, res, next) => {
    if (!poe) return void res.status(503).json({ error: 'switch not configured' })
    const on = (req.body as { on?: unknown } | undefined)?.on
    if (typeof on !== 'boolean') return void res.status(400).json({ error: 'body must be {"on": true|false}' })
    try {
      res.json(await poe.set(String(req.params.camera), on))
    } catch (error) {
      if (error instanceof UnknownCamera) return void res.status(404).json({ error: 'unknown camera' })
      next(error)
    }
  })
  return router
}
