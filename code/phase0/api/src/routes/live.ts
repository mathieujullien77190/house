// stream (le direct MJPEG) et frame (l'image à l'instant) d'une caméra, relayés depuis go2rtc.
// La réponse de go2rtc est recopiée telle quelle ; fermer l'onglet coupe la demande vers go2rtc.
import { Readable } from 'node:stream'
import { Router, type Request, type Response } from 'express'
import type { LiveService, Upstream } from '../services/liveService.ts'

const CAMERA = /^[\w-]+$/

const relay = async (req: Request, res: Response, open: (camera: string, signal: AbortSignal) => Promise<Upstream | null>) => {
  const camera = String(req.query.camera ?? '')
  if (!CAMERA.test(camera)) {
    res.status(400).json({ error: 'camera is required' })
    return
  }
  const controller = new AbortController()
  res.on('close', () => controller.abort())
  let upstream: Upstream | null
  try {
    upstream = await open(camera, controller.signal)
  } catch {
    if (!res.headersSent) res.status(502).json({ error: 'go2rtc unreachable' })
    return
  }
  if (!upstream) {
    res.status(404).json({ error: 'unknown camera' })
    return
  }
  if (upstream.status !== 200 || !upstream.body) {
    res.status(502).json({ error: `go2rtc answered ${upstream.status}` })
    return
  }
  res.status(200)
  res.setHeader('Content-Type', upstream.contentType)
  res.setHeader('Cache-Control', 'no-store')
  Readable.fromWeb(upstream.body).on('error', () => res.end()).pipe(res)
}

export const liveRouter = (live: LiveService): Router => {
  const router = Router()
  router.get('/stream', (req, res) => relay(req, res, live.stream))
  router.get('/frame', (req, res) => relay(req, res, live.frame))
  return router
}
