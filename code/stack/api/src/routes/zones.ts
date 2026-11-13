// zones : la zone de surveillance du mouvement de chaque caméra, un polygone dessiné sur l'image (GET /zones ; PUT /zones/<caméra> avec
// {"points": [[x, y], ...]} (de 3 à 1000 sommets, en parts de l'image de 0 à 1) ou {"points": null} pour surveiller toute l'image).
import express, { Router } from 'express'
import { isCameraName, parsePolygon, type ZonesStore } from '../lib/zonesStore.ts'

export const zonesRouter = (zones: ZonesStore): Router => {
  const router = Router()
  router.get('/zones', (_req, res) => {
    res.json(zones.get())
  })
  router.put('/zones/:camera', express.json({ limit: '4kb' }), (req, res, next) => {
    const camera = String(req.params.camera)
    if (!isCameraName(camera)) return void res.status(400).json({ error: 'bad camera name' })
    const value = (req.body as { points?: unknown } | undefined)?.points
    const points = value === null ? null : parsePolygon(value)
    if (value === undefined || (value !== null && points === null)) {
      return void res
        .status(400)
        .json({ error: 'body must be {"points": null} or {"points": [[x, y], ...]} with 3 to 1000 points between 0 and 1' })
    }
    try {
      res.json(zones.set(camera, points))
    } catch (error) {
      next(error)
    }
  })
  return router
}
