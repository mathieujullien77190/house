// L'assemblage de House Sync : ouvre la base, branche les modules, démarre la page, les imports périodiques, le journal Hue et le polling.
// Tout ce qui touche au système (environnement, réseau, horloge, arrêt du processus) est passé en paramètre : index.ts donne les vrais,
// les essais donnent des faux.
import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createClips } from './clips.ts'
import { loadConfig } from './config.ts'
import { messageOf, seconds, type Context, type Fetch } from './context.ts'
import { createControl } from './control.ts'
import { initDatabase } from './database.ts'
import { createEvents } from './events.ts'
import { createImports } from './imports.ts'
import { createHueLog } from './hueLog.ts'
import { apiTargetOf, createPage, createPageServer } from './page.ts'
import { createPoller } from './poll.ts'
import { createRecorder } from './recorder.ts'
import { createSettings } from './settings.ts'
import { createSnapshots } from './snapshots.ts'
import { createWeather, WEATHER_POLL_MS } from './weather.ts'
import { createGuestVisitsTable } from './guestVisits.ts'
import { createCameraEnergy, createCameraEnergyTable } from './cameraEnergy.ts'
import { createEyesTable } from './eyes.ts'
import { createLampEnergy, createLampEnergyTable } from './lampEnergy.ts'
import { createMachineEnergy, createMachineEnergyTable } from './machineEnergy.ts'
import { createHeatingLogTable } from './heatingLog.ts'
import { createShutterLogTable } from './shutterLog.ts'
import { createBoxConnectionsTable } from './boxConnections.ts'
import { createPlanTable } from './plan.ts'

export interface AppDeps {
  env: NodeJS.ProcessEnv
  fetch: Fetch
  /** L'heure, en millisecondes depuis 1970. */
  now: () => number
  log: (message: string) => void
  /** Ferme le processus (après l'arrêt propre). */
  exit: (code: number) => void
}

const STOP_WAIT_MS = 5000

/** Démarre House Sync ; rend de quoi l'arrêter proprement. */
export const startApp = async (deps: AppDeps) => {
  const config = loadConfig(deps.env)
  mkdirSync(config.dataDir, { recursive: true })
  const db = new DatabaseSync(`${config.dataDir}/events.db`)
  initDatabase(db, config.dataDir, deps.now)
  const settings = createSettings(db, config)
  const ctx: Context = { db, config, settings, fetch: deps.fetch, now: deps.now, log: deps.log }

  // Le journal des lampes Hue : l'écoute du flux d'événements du pont, gardée dans la table hue_events (hueLog.ts).
  // Il lui faut l'adresse du pont et sa clé d'application (HUE_BRIDGE_IP et HUE_APP_KEY) ; sans l'une, il reste inactif.
  const hueLog = createHueLog(db, { address: config.hueAddress, key: config.hueKey, log: deps.log, now: deps.now })
  // Les visites de la page invité et le plan de la maison : des fichiers que les autres services écrivent (lecture seule ici), importés dans la base.
  db.exec('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  createGuestVisitsTable(db)
  createHeatingLogTable(db)
  createShutterLogTable(db)
  createBoxConnectionsTable(db)
  createCameraEnergyTable(db)
  createLampEnergyTable(db)
  createEyesTable(db)
  createMachineEnergyTable(db)
  createPlanTable(db)

  const rec = createRecorder(ctx)
  const clips = createClips(ctx, rec)
  const events = createEvents(ctx, rec, clips)
  const control = createControl(ctx)
  const snapshots = createSnapshots(ctx, rec)
  const imports = createImports(ctx)
  const cameraEnergy = createCameraEnergy(ctx, () => apiTargetOf(config))
  const lampEnergy = createLampEnergy(ctx, () => apiTargetOf(config))
  const machineEnergy = createMachineEnergy(ctx)
  const poller = createPoller(ctx, { rec, events, clips, control, snapshots })
  // Les images toutes les 5, 10 ou 15 s : un minuteur à part (chaque seconde, pour tomber à une seconde près), car le tour de polling est de 30 s.
  const snapshotTimer = setInterval(() => void snapshots.again(), 1_000)
  // La pluie, pour le mode pluie automatique des caméras : la météo chez soi, relue toutes les 10 minutes.
  const weather = createWeather(ctx)
  void weather.poll()
  const weatherTimer = setInterval(() => void weather.poll(), WEATHER_POLL_MS)
  const page = createPage(ctx, { hueLog, resetLiveFpsCheck: control.resetLiveFpsCheck, watts: { cameras: cameraEnergy.current, lamps: lampEnergy.current, machine: machineEnergy.current } })

  void imports.syncPlan()
  const planTimer = setInterval(() => void imports.syncPlan(), 30_000)
  void imports.syncGuestVisits()
  const visitsTimer = setInterval(() => void imports.syncGuestVisits(), 15_000)
  void imports.syncHeatingLog()
  const heatingTimer = setInterval(() => void imports.syncHeatingLog(), 30_000)
  void imports.syncShutterLog()
  const shutterTimer = setInterval(() => void imports.syncShutterLog(), 30_000)
  void imports.syncBoxConnections()
  const boxTimer = setInterval(() => void imports.syncBoxConnections(), 30_000)

  const { server, secure } = createPageServer(config, page.handlePage)
  server.listen(config.pagePort, () => deps.log(`Page de House Sync en ${secure ? 'HTTPS' : 'HTTP'} sur le port ${config.pagePort}`))

  // L'énergie des caméras (estimation) : un relevé de la puissance PoE par minute.
  // Celle des lampes Hue (la puissance estimée par House API) et celle du mini PC (le processeur seul) suivent le même rythme.
  void cameraEnergy.sample()
  void lampEnergy.sample()
  void machineEnergy.sample()
  // La recherche des yeux qui brillent : « tourne-t-elle maintenant ? » se range en base chaque minute, pour l'icône œil de la WebApp.
  settings.refreshEyes(seconds(ctx))
  const energyTimer = setInterval(() => {
    settings.refreshEyes(seconds(ctx))
    void cameraEnergy.sample()
    void lampEnergy.sample()
    void machineEnergy.sample()
  }, 60_000)

  // ---- Le polling ----
  deps.log(`House Sync démarré (${config.dataDir}/events.db, toutes les ${config.intervalMs / 1000} s)`)
  hueLog.start()
  await poller.poll()
  const timer = setInterval(poller.poll, config.intervalMs)

  const stop = async (): Promise<void> => {
    poller.stop()
    clearInterval(timer)
    clearInterval(snapshotTimer)
    clearInterval(weatherTimer)
    clearInterval(planTimer)
    clearInterval(visitsTimer)
    clearInterval(heatingTimer)
    clearInterval(shutterTimer)
    clearInterval(boxTimer)
    clearInterval(energyTimer)
    hueLog.stop()
    server.closeAllConnections()
    server.close()
    // Le tour de polling en cours finit avant la fermeture de la base (sinon ses écritures échouent).
    for (let waited = 0; poller.isBusy() && waited < STOP_WAIT_MS; waited += 100) await new Promise((done) => setTimeout(done, 100))
    db.close()
    deps.exit(0)
  }
  return { stop, server, db, poller, page }
}

/** Une promesse rejetée oubliée est notée dans le journal : elle ne tue pas House Sync. */
export const unhandledRejectionMessage = (reason: unknown): string => `Erreur non gérée : ${messageOf(reason)}`
