// cinema : l'API de l'application de télé « cinéma » (chaque caméra est une série, ses clips sont les épisodes) : la bibliothèque, la vidéo d'un clip et sa vignette.
// Réservé à la télé : réseau local ET en-tête X-Lan-Key égal à TV_KEY (jamais la clé des invités, jamais la clé de la WebApp). Lecture seule : aucun ordre ne passe par ici.
import { Router, type RequestHandler } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { LiveService } from '../services/liveService.ts'
import { relay } from './live.ts'
import { createLanTokens } from '../lib/lanToken.ts'
import { createLanGuard } from '../middleware/lanGuard.ts'
import type { CamerasService } from '../services/camerasService.ts'
import type { EventsService } from '../services/eventsService.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'
import { lanCameras, TV_CAMERAS, type LanDeps } from './lan.ts'

const EVENT_ID = /^[\w.-]+$/
const CAMERA = /^[\w-]+$/
/** Les clips les plus récents rendus pour chaque caméra (une rangée de la télé). */
export const CINEMA_CLIPS_PER_CAMERA = 120

export interface CinemaServices {
  events: EventsService
  snapshots: SnapshotsService
  files: BackupFiles
  cameras?: CamerasService
  live: LiveService
}

export const cinemaRouter = (services: CinemaServices, deps: LanDeps): Router => {
  const router = Router()
  const tvKey = deps.tvKey ?? ''
  const guard = createLanGuard({ key: '', tvKey, tvTokens: createLanTokens(tvKey || 'none'), prefixes: deps.prefixes, tokens: createLanTokens('none') })

  const episode = (row: ReturnType<EventsService['list']>[number]) => ({
    id: row.id,
    camera: row.camera,
    label: row.label,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    clipStartedAt: row.clip_started_at,
    saved: row.saved,
    note: row.note,
    emoji: row.emoji,
    orientation: row.orientation,
    light: row.clip_h264 !== null,
    hd: row.clip !== null,
  })

  // La bibliothèque : par caméra (une série), ses derniers clips (les épisodes, du plus récent au plus ancien) ; plus les clips sauvegardés.
  router.get('/cinema/library', guard(), (_req, res) => {
    const withClip = (row: ReturnType<EventsService['list']>[number]) => row.clip !== null || row.clip_h264 !== null
    res.setHeader('Cache-Control', 'no-store')
    res.json({
      cameras: lanCameras(services.cameras, TV_CAMERAS).map((camera) => ({
        ...camera,
        episodes: services.events.list({ lastOnly: false, camera: camera.id, limit: CINEMA_CLIPS_PER_CAMERA }).filter(withClip).map(episode),
      })),
      saved: services.events.list({ lastOnly: false, savedOnly: true }).filter(withClip).map(episode),
    })
  })

  // La vidéo d'un clip : la copie légère (H.264, 720p) par défaut ; `?q=hd` l'original (H.265, 4K).
  const clip: RequestHandler = (req, res) => {
    const id = String(req.params.id)
    if (!EVENT_ID.test(id)) return void res.status(404).json({ error: 'clip not found' })
    const hd = req.query.q === 'hd'
    const path = hd ? services.events.clipPath(id, false) : (services.events.clipPath(id, true) ?? services.events.clipPath(id, false))
    if (!path) return void res.status(404).json({ error: 'clip not found' })
    services.files.send(res, path, 'video/mp4')
  }
  router.get('/cinema/clip/:id', guard(), clip)

  // La vignette d'un clip : l'image gardée la plus proche de son début (une par minute).
  router.get('/cinema/thumb', guard(), (req, res) => {
    const camera = String(req.query.camera ?? '')
    const at = Number(req.query.at)
    if (!CAMERA.test(camera) || !Number.isFinite(at)) return void res.status(400).json({ error: 'camera and at are required' })
    const found = services.snapshots.nearest(camera, at)
    if (!found) return void res.status(404).json({ error: 'no snapshot near this time' })
    res.setHeader('Cache-Control', 'private, max-age=86400')
    services.files.send(res, found.path, 'image/jpeg')
  })
  // Le direct d'une caméra en MP4 fragmenté continu (la télé ne lit pas le MJPEG) : `live.mp4` (le 4K avec `?q=hd`).
  router.get('/cinema/live/:camera/live.mp4', guard(), (req, res) => {
    const camera = String(req.params.camera)
    if (!TV_CAMERAS.some((found) => found.id === camera)) return void res.status(404).json({ error: 'caméra inconnue' })
    void relay(req, res, (name, signal, hd) => services.live.mp4(name, signal, hd), { camera, hd: req.query.q === 'hd' })
  })
  return router
}
