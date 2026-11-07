// plug : l'état de la prise connectée (GET /plug) et son changement (POST /plug, corps {"on": true|false}, ou {"on": true, "minutes": 15} : allumée
// pendant ce temps, puis la prise s'éteint toute seule).
// Sans prise configurée (PLUG_HOST absent), le service répond 503 ; une prise qui ne répond pas, 502.
import express, { Router } from 'express'
import type { PlugService } from '../services/plugService.ts'

/** Le minuteur : de 1 minute à 2 heures (la WebApp propose 5, 15 et 30 minutes). */
const MAX_TIMER_MINUTES = 120

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
    const body = (req.body ?? {}) as { on?: unknown; minutes?: unknown }
    if (typeof body.on !== 'boolean') return void res.status(400).json({ error: 'body must be {"on": true|false}' })
    if (body.minutes !== undefined && (body.on !== true || !Number.isInteger(body.minutes) || (body.minutes as number) < 1 || (body.minutes as number) > MAX_TIMER_MINUTES)) {
      return void res.status(400).json({ error: `minutes must be an integer from 1 to ${MAX_TIMER_MINUTES}, with "on": true` })
    }
    try {
      res.json(typeof body.minutes === 'number' ? await plug.startTimer(body.minutes) : await plug.set(body.on))
    } catch {
      res.status(502).json({ error: 'plug unreachable' })
    }
  })
  return router
}
