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
import { createHueClient, type HueClient } from './lib/hueClient.ts'
import { createPositionsStore } from './lib/positionsStore.ts'
import { createPlanStore } from './lib/planStore.ts'
import { createZonesStore } from './lib/zonesStore.ts'
import { createSavedClipsStore } from './lib/savedClipsStore.ts'
import { createKasaClient } from './lib/kasaClient.ts'
import { createSwitchClient } from './lib/switchClient.ts'
import { createHueService, toSensors } from './services/hueService.ts'
import { createHeatingService, createRecorder, type TemperatureSource } from './services/heatingService.ts'
import { createHeatingLog } from './lib/heatingLog.ts'
import { createHeatingSettings } from './lib/heatingSettings.ts'
import { createPlugService, type MotionSource } from './services/plugService.ts'
import { createPoeService } from './services/poeService.ts'
import { createLiveService } from './services/liveService.ts'
import { createSnapshotsService } from './services/snapshotsService.ts'

/** Le détecteur qui éteint la prise : son état de mouvement, lu chez le pont (null si le détecteur manque). */
export const createMotionSource = (hueClient: HueClient, sensorName: string): MotionSource => ({
  presence: async (): Promise<boolean | null> => {
    const found = Object.values(await hueClient.sensors()).find((sensor) => sensor.type === 'ZLLPresence' && sensor.name === sensorName)
    return found?.state.presence ?? null
  },
})

/** La température du détecteur de la volière, lue chez le pont (null si le détecteur manque ou ne la donne pas). */
export const createTemperatureSource = (hueClient: HueClient, sensorName: string): TemperatureSource => ({
  read: async (): Promise<number | null> => toSensors(await hueClient.sensors()).find((sensor) => sensor.name === sensorName)?.temperature ?? null,
})

export const createApp = (config: Config): Express => {
  const db = openDatabase(`${config.dataDir}/events.db`)
  const cameras = createCamerasRepository(db)
  const hueClient = config.hue ? createHueClient(config.hue) : null
  const motion = hueClient ? createMotionSource(hueClient, config.plugMotionSensor) : null
  const live = createLiveService(config.go2rtcUrls, cameras)
  const savedClips = createSavedClipsStore(`${config.stateDir}/saved-clips.json`)
  const heatingLog = createHeatingLog(`${config.stateDir}/heating-log.jsonl`)
  const heatingSettings = createHeatingSettings(`${config.stateDir}/heating.json`)
  const plug = config.plug
    ? createPlugService(createKasaClient(config.plug), { motion, file: `${config.stateDir}/plug-guard.json`, record: createRecorder(heatingLog, heatingSettings) })
    : null
  const services = {
    cameras: createCamerasService(cameras),
    events: createEventsService(createEventsRepository(db), savedClips),
    snapshots: createSnapshotsService(createSnapshotsRepository(db)),
    live,
    files: createBackupFiles(config.dataDir),
    zones: createZonesStore(`${config.stateDir}/zones.json`),
    plan: createPlanStore(`${config.stateDir}/plan.json`),
    recorderUrl: config.recorderUrl,
    savedClips,
    hue: hueClient ? createHueService(hueClient, createPositionsStore(`${config.stateDir}/lights-positions.json`)) : null,
    guest: config.guest,
    plug,
    heating: plug
      ? createHeatingService({
          plug,
          settings: heatingSettings,
          log: heatingLog,
          temperature: hueClient ? createTemperatureSource(hueClient, config.plugTemperatureSensor) : null,
          position: config.housePosition,
        })
      : null,
    poe: config.switchPoe ? createPoeService(createSwitchClient(config.switchPoe), config.switchPoe.ports, live.baseOf) : null,
  }

  const app = express()
  app.disable('x-powered-by')
  // La base reste accessible à qui assemble l'application (les tests la ferment pour supprimer leurs dossiers temporaires).
  app.locals.database = db
  app.use(createRoutes(config.apiKey, services, config.caCert))
  // La WebApp compilée : index.html à la racine, les scripts et styles dans assets/.
  app.use(express.static(config.webDir, { index: 'index.html' }))
  app.use(notFound)
  app.use(errorHandler)
  return app
}
