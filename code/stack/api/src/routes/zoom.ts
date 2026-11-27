// zoom : le zoom optique d'une caméra (RLC-811A). GET /cameras/<nom>/zoom rend {pos, min, max} ; PUT /cameras/<nom>/zoom {"pos": entier} le règle
// (une position hors de la plage est ramenée à sa borne) et rend {pos, min, max} avec la position demandée à la caméra.
// Les deux réponses portent `paused` : vrai tant que l'enregistreur a ses analyses en pause pour cette caméra (zoom hors du grand angle, services/zoomPauseService.ts) ; un enregistreur
// muet ne fait jamais échouer le réglage.
// 404 si la caméra n'a pas de zoom optique configuré (CAMERA_ZOOMS), 400 si le corps est faux, 502 si la caméra ne répond pas.
// Le compte de la caméra est dans l'adresse que l'API appelle : l'erreur de la caméra n'est ni relayée ni journalisée, la réponse est un texte fixe.
import express, { Router } from 'express'
import { UnknownZoomCamera, type ZoomService } from '../services/zoomService.ts'

const BODY_ERROR = 'body must be {"pos": integer}'

export const zoomRouter = (zoom: ZoomService | null): Router => {
  const router = Router()
  /** L'erreur du service en réponse : 404 pour une caméra sans zoom, 502 sinon (sans détail). */
  const fail = (res: express.Response, error: unknown): void => {
    if (error instanceof UnknownZoomCamera) return void res.status(404).json({ error: 'no optical zoom on this camera' })
    res.status(502).json({ error: 'camera unreachable' })
  }
  router.get('/cameras/:name/zoom', async (req, res) => {
    if (!zoom) return void res.status(404).json({ error: 'no optical zoom on this camera' })
    try {
      res.json(await zoom.get(req.params.name))
    } catch (error) {
      fail(res, error)
    }
  })
  router.put('/cameras/:name/zoom', express.json({ limit: '1kb' }), async (req, res) => {
    if (!zoom) return void res.status(404).json({ error: 'no optical zoom on this camera' })
    const pos = (req.body as { pos?: unknown } | undefined)?.pos
    if (typeof pos !== 'number' || !Number.isInteger(pos)) return void res.status(400).json({ error: BODY_ERROR })
    try {
      res.json(await zoom.set(req.params.name, pos))
    } catch (error) {
      fail(res, error)
    }
  })
  return router
}
