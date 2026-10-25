// direct et image : les adresses de chaque caméra chez Frigate.
import { Router } from 'express'
import type { CamerasService } from '../services/camerasService.ts'

export const camerasRouter = (cameras: CamerasService): Router => {
  const router = Router()
  router.get('/direct', (_req, res) => {
    res.json(cameras.liveStreams())
  })
  router.get('/image', (_req, res) => {
    res.json(cameras.lastImages())
  })
  return router
}
