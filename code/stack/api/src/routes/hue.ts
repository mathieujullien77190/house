// hue : les pièces et leurs lampes (GET /hue), les positions des ampoules sur le plan (GET et PUT /hue/positions) ; PUT /hue/rooms/:id et PUT /hue/lights/:id avec {"on": true|false} et/ou {"bri": 1..254}.
// Sans pont configuré (HUE_APP_KEY absente), le service répond 503.
import express, { Router } from 'express'
import type { HueService } from '../services/hueService.ts'
import { parsePositions } from '../lib/positionsStore.ts'
import { parseState, UnknownHueId } from '../services/hueService.ts'

export const hueRouter = (hue: HueService | null): Router => {
  const router = Router()
  router.get('/hue', async (_req, res, next) => {
    if (!hue) return void res.status(503).json({ error: 'hue bridge not configured' })
    try {
      res.json(await hue.list())
    } catch (error) {
      next(error)
    }
  })
  router.get('/hue/positions', (_req, res) => {
    if (!hue) return void res.status(503).json({ error: 'hue bridge not configured' })
    res.json(hue.positions())
  })
  router.put('/hue/positions', express.json({ limit: '16kb' }), (req, res, next) => {
    if (!hue) return void res.status(503).json({ error: 'hue bridge not configured' })
    const changes = parsePositions(req.body)
    if (!changes) return void res.status(400).json({ error: 'body must be {"<lamp id>": {"x": number, "y": number}}' })
    try {
      res.json(hue.setPositions(changes))
    } catch (error) {
      next(error)
    }
  })
  for (const kind of ['rooms', 'lights'] as const) {
    router.put(`/hue/${kind}/:id`, express.json({ limit: '1kb' }), async (req, res, next) => {
      if (!hue) return void res.status(503).json({ error: 'hue bridge not configured' })
      const state = parseState(req.body)
      if (!state) return void res.status(400).json({ error: 'body must be {"on": true|false} and/or {"bri": 1..254}' })
      try {
        const id = String(req.params.id)
        res.json(await (kind === 'rooms' ? hue.setRoom(id, state) : hue.setLight(id, state)))
      } catch (error) {
        if (error instanceof UnknownHueId) return void res.status(404).json({ error: 'unknown id' })
        next(error)
      }
    })
  }
  return router
}
