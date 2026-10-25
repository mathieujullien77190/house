// snapshots (les instants couverts par une image) et snapshot (l'image la plus proche d'un instant).
import { Router } from 'express'
import type { BackupFiles } from '../lib/backupFiles.ts'
import type { SnapshotsService } from '../services/snapshotsService.ts'

const CAMERA = /^[\w-]+$/

const numberParam = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const snapshotsRouter = (snapshots: SnapshotsService, files: BackupFiles): Router => {
  const router = Router()
  router.get('/snapshots', (req, res) => {
    const camera = String(req.query.camera ?? '')
    if (!CAMERA.test(camera)) {
      res.status(400).json({ error: 'camera is required' })
      return
    }
    res.json(snapshots.times(camera, numberParam(req.query.from, 0), numberParam(req.query.to, Number.MAX_SAFE_INTEGER)))
  })
  router.get('/snapshot', (req, res) => {
    const camera = String(req.query.camera ?? '')
    const at = Number(req.query.at)
    if (!CAMERA.test(camera) || !Number.isFinite(at)) {
      res.status(400).json({ error: 'camera and at are required' })
      return
    }
    const path = snapshots.nearestPath(camera, at)
    if (!path) {
      res.status(404).json({ error: 'no snapshot near this time' })
      return
    }
    files.send(res, path, 'image/jpeg')
  })
  return router
}
