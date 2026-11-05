// plug : l'état de la prise connectée (GET /plug) et son changement (POST /plug, corps {"on": true|false}).
// Sans prise configurée (PLUG_HOST absent), le service répond 503 ; une prise qui ne répond pas, 502.
import express, { Router } from 'express'
import type { PlugService } from '../services/plugService.ts'

export const plugRouter = (plug: PlugService | null): Router => {
  const router = Router()
  router.get('/plug', async (_req, res) => {
    if (!plug) return void res.status(503).json({ error: 'plug not configured' })
    try {
      res.json(await plug.get())
    } catch {
      res.status(502).json({ error: 'plug unreachable' })
    }
  })
  router.post('/plug', express.json({ limit: '1kb' }), async (req, res) => {
    if (!plug) return void res.status(503).json({ error: 'plug not configured' })
    const on = (req.body as { on?: unknown } | undefined)?.on
    if (typeof on !== 'boolean') return void res.status(400).json({ error: 'body must be {"on": true|false}' })
    try {
      res.json(await plug.set(on))
    } catch {
      res.status(502).json({ error: 'plug unreachable' })
    }
  })
  return router
}
