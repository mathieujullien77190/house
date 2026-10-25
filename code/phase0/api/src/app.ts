// L'application Express : les services JSON derrière la clé, la WebApp en statique, les erreurs en JSON.
import express, { type Express } from 'express'
import type { Config } from './config.ts'
import { openDatabase } from './db/database.ts'
import { createBackupFiles } from './lib/backupFiles.ts'
import { errorHandler, notFound } from './middleware/errorHandler.ts'
import { createCamerasRepository } from './repositories/camerasRepository.ts'
import { createEventsRepository } from './repositories/eventsRepository.ts'
import { createSnapshotsRepository } from './repositories/snapshotsRepository.ts'
import { createRoutes } from './routes/index.ts'
import { createCamerasService } from './services/camerasService.ts'
import { createEventsService } from './services/eventsService.ts'
import { createSnapshotsService } from './services/snapshotsService.ts'

export const createApp = (config: Config): Express => {
  const db = openDatabase(`${config.dataDir}/events.db`)
  const services = {
    cameras: createCamerasService(createCamerasRepository(db)),
    events: createEventsService(createEventsRepository(db)),
    snapshots: createSnapshotsService(createSnapshotsRepository(db)),
    files: createBackupFiles(config.dataDir),
  }

  const app = express()
  app.disable('x-powered-by')
  app.use(createRoutes(config.apiKey, services))
  // La WebApp compilée : index.html à la racine, les scripts et styles dans assets/.
  app.use(express.static(config.webDir, { index: 'index.html' }))
  app.use(notFound)
  app.use(errorHandler)
  return app
}
