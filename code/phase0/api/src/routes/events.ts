// events (le dernier de chaque caméra avec ?last=1 ; avec ?camera=, ?from= et ?to= (secondes) les événements qui touchent
// cette fenêtre, au plus 1000 (?limit= pour moins) ; sinon les 200 derniers) et clips/:id (la vidéo d'un événement).
import { Router } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { EventsService } from '../services/eventsService.ts'

const EVENT_ID = /^[\w.-]+$/
const CAMERA = /^[\w-]+$/

/** Un nombre de la requête, ou undefined s'il manque ; null s'il est invalide. */
const numberOf = (value: unknown): number | undefined | null => {
  if (value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const eventsRouter = (events: EventsService, files: BackupFiles): Router => {
  const router = Router()
  router.get('/events', (req, res) => {
    const from = numberOf(req.query.from)
    const to = numberOf(req.query.to)
    const limit = numberOf(req.query.limit)
    const camera = req.query.camera === undefined ? undefined : String(req.query.camera)
    if (from === null || to === null || limit === null || (camera !== undefined && !CAMERA.test(camera))) {
      res.status(400).json({ error: 'bad query' })
      return
    }
    res.json(events.list({ lastOnly: req.query.last === '1', camera, from, to, limit }))
  })
  router.get('/clips/:id', (req, res) => {
    const id = String(req.params.id)
    const path = EVENT_ID.test(id) ? events.clipPath(id) : null
    if (!path) {
      res.status(404).json({ error: 'clip not found' })
      return
    }
    files.send(res, path, 'video/mp4')
  })
  return router
}
