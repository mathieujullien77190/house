// markers : les repères de caméras posés sur l'image d'une caméra (GET /markers ; PUT /markers/<caméra> avec {"markers": [{"target": "<autre caméra>", "x": 0.3, "y": 0.5}, ...]}
// (8 au plus, x et y en parts de l'image, de -0,5 à 1,5 : un repère peut être hors de la vidéo) ou {"markers": null} pour revenir aux places de départ).
import express, { Router } from 'express'
import { isCameraName, parseMarkers, type MarkersStore } from '../lib/markersStore.ts'

export const markersRouter = (markers: MarkersStore): Router => {
  const router = Router()
  router.get('/markers', (_req, res) => {
    res.json(markers.get())
  })
  router.put('/markers/:camera', express.json({ limit: '4kb' }), (req, res, next) => {
    const camera = String(req.params.camera)
    if (!isCameraName(camera)) return void res.status(400).json({ error: 'bad camera name' })
    const value = (req.body as { markers?: unknown } | undefined)?.markers
    const list = value === null ? null : parseMarkers(value)
    if (value === undefined || (value !== null && list === null)) {
      return void res.status(400).json({ error: 'body must be {"markers": null} or {"markers": [{"target": "camera", "x": -0.5..1.5, "y": -0.5..1.5}, ...]} with 8 markers at most' })
    }
    try {
      res.json(markers.set(camera, list))
    } catch (error) {
      next(error)
    }
  })
  return router
}
