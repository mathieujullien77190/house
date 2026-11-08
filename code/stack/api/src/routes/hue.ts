// hue : les pièces et leurs lampes (GET /hue), l'extinction en douceur d'une lampe (GET, POST, DELETE /hue/lights/:id/fade), les règles d'automatisation du pont (GET /hue/automations), les détecteurs de mouvement (GET /hue/sensors), les positions des ampoules sur le plan (GET et PUT /hue/positions) ; PUT /hue/rooms/:id et PUT /hue/lights/:id avec {"on": true|false} et/ou {"bri": 1..254}.
// Sans pont configuré (HUE_APP_KEY absente), le service répond 503.
import express, { Router } from 'express'
import type { HueService } from '../services/hueService.ts'
import { parsePositions } from '../lib/positionsStore.ts'
import { FadeImpossible, parseState, UnknownHueId } from '../services/hueService.ts'

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
  router.get('/hue/automations', async (_req, res, next) => {
    if (!hue) return void res.status(503).json({ error: 'hue bridge not configured' })
    try {
      res.json(await hue.automations())
    } catch (error) {
      next(error)
    }
  })
  router.get('/hue/sensors', async (_req, res, next) => {
    if (!hue) return void res.status(503).json({ error: 'hue bridge not configured' })
    try {
      res.json(await hue.sensors())
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
  // GET, POST et DELETE /hue/lights/:id/fade : l'extinction en douceur d'une lampe (sa luminosité descend au minimum en {"minutes": 15} par défaut, de 1 à 60, puis elle s'éteint) ; GET dit si elle est en cours et quand elle finit.
  router.all('/hue/lights/:id/fade', express.json({ limit: '1kb' }), async (req, res, next) => {
    if (!hue) return void res.status(503).json({ error: 'hue bridge not configured' })
    const id = String(req.params.id)
    try {
      if (req.method === 'GET') return void res.json(await hue.fade.status(id))
      if (req.method === 'DELETE') return void res.json(await hue.fade.cancel(id))
      if (req.method !== 'POST') return void res.status(405).json({ error: 'method not allowed' })
      const asked = (req.body as { minutes?: unknown } | undefined)?.minutes
      const minutes = asked === undefined ? 15 : asked
      if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
        return void res.status(400).json({ error: 'minutes must be a number from 1 to 60' })
      }
      res.json(await hue.fade.start(id, minutes))
    } catch (error) {
      if (error instanceof UnknownHueId) return void res.status(404).json({ error: 'unknown id' })
      if (error instanceof FadeImpossible) return void res.status(409).json({ error: 'the light is off or unreachable' })
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
