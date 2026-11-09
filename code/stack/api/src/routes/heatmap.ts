// heatmap : la carte de chaleur d'une caméra (où l'image change d'une image gardée à la suivante) ; la première demande lance le calcul, les suivantes en lisent l'avancement.
import { Router } from 'express'
import type { HeatmapService } from '../services/heatmapService.ts'

const CAMERA = /^[\w-]+$/

export const heatmapRouter = (heatmap: HeatmapService): Router => {
  const router = Router()
  router.get('/heatmap', (req, res) => {
    const camera = String(req.query.camera ?? '')
    if (!CAMERA.test(camera)) {
      res.status(400).json({ error: 'camera is required' })
      return
    }
    res.json(heatmap.status(camera))
  })
  return router
}
