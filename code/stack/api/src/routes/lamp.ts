// lamp-history : les plages où une lampe Hue était allumée, d'après le journal de House Sync (sans passer par le pont).
import { Router } from 'express'
import type { LampService } from '../services/lampService.ts'

const NAME_MAX = 80

const numberParam = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const lampRouter = (lamp: LampService): Router => {
  const router = Router()
  router.get('/lamp-history', (req, res) => {
    const name = String(req.query.name ?? '')
    if (name === '' || name.length > NAME_MAX) {
      res.status(400).json({ error: 'name is required' })
      return
    }
    res.json(lamp.periods(name, numberParam(req.query.from, 0), numberParam(req.query.to, Math.floor(Date.now() / 1000))))
  })
  return router
}
