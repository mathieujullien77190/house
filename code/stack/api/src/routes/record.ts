// record : l'enregistrement d'un clip lancé à la main, caméra par caméra. GET /record/<caméra> dit s'il est en cours (et depuis quand), POST /record/<caméra> le commence, DELETE /record/<caméra>
// l'arrête : l'enregistreur (motion) ouvre puis ferme un mouvement fictif, et son clip se fait et se copie comme celui d'un vrai mouvement (au bout d'une minute environ). Le clip est sauvegardé d'office. Un enregistrement
// s'arrête seul au bout de 3 minutes. 503 sans RECORDER_URL, 502 si l'enregistreur ne répond pas.
import { Router } from 'express'
import type { SavedClipsStore } from '../lib/savedClipsStore.ts'

const CAMERA = /^[\w-]{1,40}$/
const TIMEOUT_MS = 5000

export const recordRouter = (recorderUrl: string | null, savedClips: SavedClipsStore): Router => {
  const router = Router()
  router.all('/record/:camera', async (req, res) => {
    const camera = String(req.params.camera)
    if (!CAMERA.test(camera)) return void res.status(400).json({ error: 'bad camera name' })
    if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE')
      return void res.status(405).json({ error: 'method not allowed' })
    if (!recorderUrl) return void res.status(503).json({ error: 'recorder not configured' })
    try {
      const upstream = await fetch(`${recorderUrl}/api/cameras/${encodeURIComponent(camera)}/record`, {
        method: req.method,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const body = (await upstream.json()) as { id?: unknown }
      // Un clip enregistré à la main est sauvegardé d'office : House Sync ne l'efface jamais (c'est un clip qu'on a voulu). On le note dès le début, il vaut aussi pour l'arrêt automatique.
      if (req.method === 'POST' && upstream.ok && typeof body.id === 'string') {
        try {
          savedClips.set(body.id, true)
        } catch {
          // Un identifiant que la liste refuse ne doit pas faire croire que l'enregistrement n'a pas commencé.
        }
      }
      res.status(upstream.status).json(body)
    } catch {
      res.status(502).json({ error: 'recorder does not answer' })
    }
  })
  return router
}
