// events (le dernier de chaque caméra avec ?last=1 ; avec ?camera=, ?from= et ?to= (secondes) les événements qui touchent
// cette fenêtre, au plus 1000 (?limit= pour moins) ; sinon les 200 derniers) et clips/:id (la vidéo d'un événement).
import express, { Router, type RequestHandler } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import { isEmoji } from '../lib/clipEmojisStore.ts'
import { MAX_NOTE_LENGTH } from '../lib/clipNotesStore.ts'
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
    // LIMIT de SQLite veut un entier : « 1.5 » devient 1.
    res.json(events.list({ lastOnly: req.query.last === '1', savedOnly: req.query.saved === '1', camera, from, to, limit: limit === undefined ? undefined : Math.floor(limit) }))
  })
  // L'original (H.265, 4K) et, à côté, la copie légère (H.264, 720p) que tous les navigateurs lisent.
  const sendClip = (h264: boolean): RequestHandler => (req, res) => {
    const id = String(req.params.id)
    const path = EVENT_ID.test(id) ? events.clipPath(id, h264) : null
    if (!path) {
      res.status(404).json({ error: 'clip not found' })
      return
    }
    files.send(res, path, 'video/mp4')
  }
  // Sauvegarder un clip : { saved: true|false }. Un clip sauvegardé n'est jamais effacé par le ménage de House Sync.
  router.put('/clips/:id/saved', express.json({ limit: '1kb' }), (req, res, next) => {
    const id = String(req.params.id)
    const saved = (req.body as { saved?: unknown } | undefined)?.saved
    if (!EVENT_ID.test(id) || typeof saved !== 'boolean') return void res.status(400).json({ error: 'body must be {"saved": true|false}' })
    try {
      if (!events.setSaved(id, saved)) return void res.status(404).json({ error: 'clip not found' })
      res.json({ id, saved })
    } catch (error) {
      next(error)
    }
  })
  // La note d'un clip : { note: "renard" } (au plus 200 caractères ; vide : supprimée).
  router.put('/clips/:id/note', express.json({ limit: '2kb' }), (req, res, next) => {
    const id = String(req.params.id)
    const note = (req.body as { note?: unknown } | undefined)?.note
    if (!EVENT_ID.test(id) || typeof note !== 'string' || note.length > MAX_NOTE_LENGTH * 2) return void res.status(400).json({ error: 'body must be {"note": "text"}' })
    try {
      if (!events.setNote(id, note)) return void res.status(404).json({ error: 'clip not found' })
      res.json({ id, note: note.trim().slice(0, MAX_NOTE_LENGTH) })
    } catch (error) {
      next(error)
    }
  })
  // L'emoji d'un clip : { emoji: "🦊" } (un seul pictogramme) ou { emoji: null } pour le retirer. Il s'affiche sur la carte de la maison.
  router.put('/clips/:id/emoji', express.json({ limit: '2kb' }), (req, res, next) => {
    const id = String(req.params.id)
    const emoji = (req.body as { emoji?: unknown } | undefined)?.emoji
    if (!EVENT_ID.test(id) || !(emoji === null || (typeof emoji === 'string' && isEmoji(emoji)))) return void res.status(400).json({ error: 'body must be {"emoji": "🦊"} or {"emoji": null}' })
    try {
      if (!events.setEmoji(id, emoji)) return void res.status(404).json({ error: 'clip not found' })
      res.json({ id, emoji: emoji ?? '' })
    } catch (error) {
      next(error)
    }
  })
  router.get('/clips/:id', sendClip(false))
  router.get('/clips/:id/h264', sendClip(true))
  // Le son du clip (AAC), à part de la vidéo : la WebApp le joue avec elle. 404 sans son (caméra sans micro, clip d'avant).
  router.get('/clips/:id/audio', (req, res) => {
    const id = String(req.params.id)
    const path = EVENT_ID.test(id) ? events.clipAudioPath(id) : null
    if (!path) return void res.status(404).json({ error: 'sound not found' })
    files.send(res, path, 'audio/aac')
  })
  // Les contours du mouvement du clip (JSON), que la WebApp dessine par-dessus la vidéo. 404 pour un clip fait avant leur ajout.
  router.get('/clips/:id/shapes', (req, res) => {
    const id = String(req.params.id)
    const path = EVENT_ID.test(id) ? events.clipShapesPath(id) : null
    if (!path) return void res.status(404).json({ error: 'shapes not found' })
    files.send(res, path, 'application/json')
  })
  return router
}
