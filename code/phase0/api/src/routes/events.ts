// events (le dernier de chaque caméra avec ?last=1, sinon les 200 derniers) et clips/:id (la vidéo d'un événement).
import { Router } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { EventsService } from '../services/eventsService.ts'

const EVENT_ID = /^[\w.-]+$/

export const eventsRouter = (events: EventsService, files: BackupFiles): Router => {
  const router = Router()
  router.get('/events', (req, res) => {
    res.json(events.list(req.query.last === '1'))
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
