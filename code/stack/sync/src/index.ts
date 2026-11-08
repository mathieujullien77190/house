// House Sync : à intervalle régulier, il lit chez l'enregistreur (le conteneur motion) les caméras
// et les événements terminés, copie chaque clip sur le disque backup et écrit dans SQLite les événements,
// l'adresse de la dernière image et l'adresse iframe du direct de chaque caméra.
// Seul House Sync écrit dans cette base ; House API la lit. Il sert aussi sa propre page (port 8081, HTTPS,
// derrière la clé) qui montre la base et les fichiers du disque backup : l'API n'expose jamais la base brute.
import { intSetting, readJsonObject, sendJson } from './http.ts'
import { timingSafeEqual } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { extname, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { DatabaseSync } from 'node:sqlite'
import { readDocker } from './docker.ts'
import { readSpecs } from './specs.ts'
import { parseRange } from './range.ts'
import { createToken, isValidToken, sessionCookie } from './session.ts'
import { readHueBridge } from './hue.ts'
import { createHueLog } from './hueLog.ts'
import { createAttemptLimiter } from './attempts.ts'
import { readNetwork } from './network.ts'
import { readSystem } from './system.ts'
import { isNight } from './sun.ts'
import { readGuestEnabled, writeGuestEnabled } from './guestState.ts'
import { createGuestVisitsTable, importGuestVisits, purgeGuestVisits } from './guestVisits.ts'
import { readSavedIds } from './savedClips.ts'
import { createPlanTable, importPlan, readPlan } from './plan.ts'
import { readZones } from './zones.ts'
import { readPower, type ApiTarget } from './power.ts'
import { clipCameras, clipFilterParams, filterClips, filterParams, groupClips, listBackup, pageParams, paginate, readDiskSpace, readTable, summarizeTables, sumSize } from './data.ts'

// L'enregistreur (conteneur motion) : son API est interne, sans mot de passe, jamais publiée.
// Les enregistreurs à interroger (un par machine) : RECORDER_URLS, séparés par des virgules ; RECORDER_URL pour un seul.
const RECORDERS = (process.env.RECORDER_URLS ?? process.env.RECORDER_URL ?? 'http://motion:8080')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean)
// La page de House Sync (une petite app React, dossier web) : sa clé (la même que l'API), son port et le certificat.
const HOUSE_KEY = process.env.HOUSE_KEY ?? ''
/** Une clé plus courte n'ouvre aucune session : la page reste fermée tant que HOUSE_KEY n'est pas réglée. */
const MIN_KEY_LENGTH = 8
const PAGE_PORT = Number(process.env.PAGE_PORT ?? 8081)
const WEB_DIR = resolve(process.env.WEB_DIR ?? './web')
const TLS_CERT = process.env.TLS_CERT ?? ''
const TLS_KEY = process.env.TLS_KEY ?? ''
const SESSION_COOKIE = 'house_sync'
const DATA_DIR = process.env.DATA_DIR ?? './data'
// La consommation : le fichier écrit sur l'hôte (power/house-power.sh) et House API (le PoE des caméras, même clé).
const POWER_FILE = process.env.POWER_FILE ?? '/power/cpu.json'
const DOCKER_FILE = process.env.DOCKER_FILE ?? '/power/docker.json'
const COMPOSE_FILE = process.env.COMPOSE_FILE ?? '/host/docker-compose.yml'
const API_URL = process.env.API_URL ?? ''
const API_CA_FILE = process.env.API_CA_FILE ?? ''
const API_SERVERNAME = process.env.API_SERVERNAME ?? 'localhost'
const apiTarget = (): ApiTarget | null =>
  API_URL && HOUSE_KEY && existsSync(API_CA_FILE) ? { url: API_URL, key: HOUSE_KEY, ca: readFileSync(API_CA_FILE, 'utf8'), servername: API_SERVERNAME } : null
const INTERVAL_MS = Number(process.env.POLL_INTERVAL_SECONDS ?? 30) * 1000
const EVENTS_PER_POLL = 50
// Un événement long peut se terminer après des événements plus récents : on relit une heure en arrière.
const LOOK_BACK_SECONDS = 3600
// L'enregistreur n'enregistre que sur mouvement : entre deux événements, il ne reste rien. House Sync garde donc
// une image par minute et par caméra (image du flux principal, 720 px de haut) pendant quelques jours.
const SNAPSHOT_INTERVAL_SECONDS = Number(process.env.SNAPSHOT_INTERVAL_SECONDS ?? 60)
const SNAPSHOT_RETENTION_DAYS = Number(process.env.SNAPSHOT_RETENTION_DAYS ?? 7)
const SNAPSHOT_HEIGHT = 720

type RecorderConfig = { cameras: Record<string, { live?: { go2rtc?: string; streams?: Record<string, string> } }> }
type RecorderEvent = {
  id: string
  merged_into?: string
  merged_at?: number
  camera: string
  label: string
  start_time: number
  end_time: number | null
  has_clip: boolean
}

mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(`${DATA_DIR}/events.db`)
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    camera TEXT NOT NULL,
    label TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    clip_path TEXT,
    clip_started_at INTEGER,
    clip_web_path TEXT
  );
  CREATE TABLE IF NOT EXISTS last_images (
    camera TEXT PRIMARY KEY,
    url TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS live_streams (
    camera TEXT PRIMARY KEY,
    url TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS snapshots (
    camera TEXT NOT NULL,
    taken_at INTEGER NOT NULL,
    path TEXT NOT NULL,
    PRIMARY KEY (camera, taken_at)
  );
  CREATE TABLE IF NOT EXISTS settings (
    camera TEXT PRIMARY KEY,
    clips_enabled INTEGER NOT NULL DEFAULT 1,
    clips_mode TEXT,
    live_fps INTEGER,
    light_fps INTEGER,
    snapshot_seconds INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS merges (
    absorbed_id TEXT PRIMARY KEY,
    kept_id TEXT NOT NULL,
    camera TEXT NOT NULL,
    absorbed_started_at INTEGER NOT NULL,
    absorbed_ended_at INTEGER,
    merged_at INTEGER NOT NULL
  );
`)
/** Ajoute une colonne à une table qui existe déjà (les bases créées avant elle ne l'ont pas). */
const addColumn = (table: string, column: string, type: string) => {
  if (!(db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((existing) => existing.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}
// Les réglages de la sauvegarde, par caméra (réglés depuis la page) : garder ou non les clips, une image toutes les N secondes.
// Les bases créées avant le mode « la nuit » ont `clips_enabled` seul.
addColumn('settings', 'clips_mode', 'TEXT')
addColumn('settings', 'live_fps', 'INTEGER')
addColumn('settings', 'light_fps', 'INTEGER')
// La cadence des directs sur un écran de moins de 1024 px (téléphone), réglée à part de celle du PC.
for (const column of ['live_fps_mobile', 'light_fps_mobile', 'motion_sensitivity']) addColumn('settings', column, 'INTEGER')
const settingsOf = db.prepare('SELECT clips_enabled, clips_mode, live_fps, light_fps, live_fps_mobile, light_fps_mobile, motion_sensitivity, snapshot_seconds FROM settings WHERE camera = ?')
const saveSettings = db.prepare(
  'INSERT INTO settings (camera, clips_enabled, clips_mode, live_fps, light_fps, live_fps_mobile, light_fps_mobile, motion_sensitivity, snapshot_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(camera) DO UPDATE SET clips_enabled = excluded.clips_enabled, clips_mode = excluded.clips_mode, live_fps = excluded.live_fps, light_fps = excluded.light_fps, live_fps_mobile = excluded.live_fps_mobile, light_fps_mobile = excluded.light_fps_mobile, motion_sensitivity = excluded.motion_sensitivity, snapshot_seconds = excluded.snapshot_seconds',
)
const knownCameras = db.prepare('SELECT camera FROM last_images ORDER BY camera')
/** Les intervalles d'image proposés (secondes) : au-delà de 5 min, « l'image à cet instant » serait trop loin. */
const SNAPSHOT_CHOICES = [30, 60, 120, 300]
// Les clips : toujours, seulement la nuit (de 30 min avant le coucher du soleil à 30 min après son lever), ou jamais.
const CLIP_MODES = ['always', 'night', 'off']
type ClipMode = 'always' | 'night' | 'off'
const NIGHT_MARGIN_SECONDS = 30 * 60
// Le soleil se calcule pour la maison (HOUSE_LATITUDE et HOUSE_LONGITUDE ; par défaut la Seine-et-Marne, à quelques minutes près).
const HOUSE_POSITION = { latitude: Number(process.env.HOUSE_LATITUDE ?? 48.6), longitude: Number(process.env.HOUSE_LONGITUDE ?? 2.7) }
/** Images par seconde du direct 4K : de 1 à 25 (25 : toutes, au rythme de la caméra). */
const MAX_LIVE_FPS = 25
/** La sensibilité de la détection de mouvement : de 1 (petits mouvements ignorés) à 5 (très sensible) ; 3 : les seuils de base. */
const MIN_SENSITIVITY = 1
const MAX_SENSITIVITY = 5
const DEFAULT_SENSITIVITY = 3
interface CameraSettings {
  camera: string
  clips_mode: ClipMode
  live_fps: number
  light_fps: number
  live_fps_mobile: number
  light_fps_mobile: number
  /** La sensibilité de la détection de mouvement, de 1 à 5 (3 : les seuils de base de l'enregistreur). */
  motion_sensitivity: number
  snapshot_seconds: number
}
const cameraSettings = (camera: string): CameraSettings => {
  const row = settingsOf.get(camera) as
    | { clips_enabled: number; clips_mode: string | null; live_fps: number | null; light_fps: number | null; live_fps_mobile: number | null; light_fps_mobile: number | null; motion_sensitivity: number | null; snapshot_seconds: number }
    | undefined
  const mode = row?.clips_mode && CLIP_MODES.includes(row.clips_mode) ? (row.clips_mode as ClipMode) : row && row.clips_enabled !== 1 ? 'off' : 'always'
  return {
    camera,
    clips_mode: mode,
    live_fps: row?.live_fps ?? MAX_LIVE_FPS,
    light_fps: row?.light_fps ?? MAX_LIVE_FPS,
    live_fps_mobile: row?.live_fps_mobile ?? MAX_LIVE_FPS,
    light_fps_mobile: row?.light_fps_mobile ?? MAX_LIVE_FPS,
    motion_sensitivity: row?.motion_sensitivity ?? DEFAULT_SENSITIVITY,
    snapshot_seconds: row?.snapshot_seconds ?? SNAPSHOT_INTERVAL_SECONDS,
  }
}
// Le clip d'un événement qui commence à cet instant est-il à garder ?
const keepsClip = (camera: string, startTime: number): boolean => {
  const mode = cameraSettings(camera).clips_mode
  return mode === 'always' || (mode === 'night' && isNight(startTime, HOUSE_POSITION, NIGHT_MARGIN_SECONDS))
}
const insertSnapshot = db.prepare('INSERT OR IGNORE INTO snapshots (camera, taken_at, path) VALUES (?, ?, ?)')
const oldSnapshots = db.prepare('SELECT camera, taken_at, path FROM snapshots WHERE taken_at < ?')
const deleteSnapshot = db.prepare('DELETE FROM snapshots WHERE camera = ? AND taken_at = ?')
const upsertImage = db.prepare(
  'INSERT INTO last_images (camera, url) VALUES (?, ?) ON CONFLICT(camera) DO UPDATE SET url = excluded.url',
)
const upsertLive = db.prepare(
  'INSERT INTO live_streams (camera, url) VALUES (?, ?) ON CONFLICT(camera) DO UPDATE SET url = excluded.url',
)
// Les bases créées avant cette colonne la reçoivent ici (le début réel du clip, pour caler la lecture sur la frise).
addColumn('events', 'clip_started_at', 'INTEGER')
// Idem pour la copie légère du clip (H.264, 720p), à côté de l'original (H.265, 4K).
addColumn('events', 'clip_web_path', 'TEXT')
// Idem pour le son du clip (AAC, à part de la vidéo), pour les caméras à son.
addColumn('events', 'clip_audio_path', 'TEXT')
const findEvent = db.prepare('SELECT ended_at FROM events WHERE id = ?')
// Le journal des fusions : un événement absorbé par un autre (ses clips se recouvraient) est noté ici avant d'être retiré de events.
const insertMerge = db.prepare('INSERT OR IGNORE INTO merges (absorbed_id, kept_id, camera, absorbed_started_at, absorbed_ended_at, merged_at) VALUES (?, ?, ?, ?, ?, ?)')
const clearWebClip = db.prepare('UPDATE events SET clip_web_path = NULL WHERE id = ?')
const clearAudioClip = db.prepare('UPDATE events SET clip_audio_path = NULL WHERE id = ?')
// Un événement en cours est inséré sans fin ni clip ; une fois terminé, la même ligne reçoit sa fin et son clip.
const upsertEvent = db.prepare(
  'INSERT INTO events (id, camera, label, started_at, ended_at, clip_path, clip_started_at) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET label = excluded.label, ended_at = excluded.ended_at, clip_path = excluded.clip_path, clip_started_at = excluded.clip_started_at',
)
const openEvents = db.prepare('SELECT id, camera FROM events WHERE ended_at IS NULL')
const deleteEvent = db.prepare('DELETE FROM events WHERE id = ?')
const lastStarts = db.prepare('SELECT camera, MAX(started_at) AS t FROM events GROUP BY camera')
const eventsWithoutClip = db.prepare(
  'SELECT id, camera, label, started_at, ended_at FROM events WHERE clip_path IS NULL AND ended_at IS NOT NULL AND ended_at <= ? AND started_at > ?',
)
const updateClip = db.prepare('UPDATE events SET clip_path = ?, clip_started_at = ? WHERE id = ?')
const clipsWithoutWeb = db.prepare('SELECT id, camera, clip_path FROM events WHERE clip_path IS NOT NULL AND clip_web_path IS NULL AND started_at > ?')
const updateWebClip = db.prepare('UPDATE events SET clip_web_path = ? WHERE id = ?')
// Le son se demande quand la copie légère est là : l'enregistreur a alors tout fait (clip, son, copie légère).
const clipsWithoutAudio = db.prepare('SELECT id, camera, clip_path FROM events WHERE clip_path IS NOT NULL AND clip_web_path IS NOT NULL AND clip_audio_path IS NULL AND started_at > ?')
const updateAudioClip = db.prepare('UPDATE events SET clip_audio_path = ? WHERE id = ?')
// Un clip peut ne pas être prêt au moment de la copie : on réessaie tant que l'enregistreur garde ses enregistrements.
const CLIP_RETRY_SECONDS = 6 * 3600
// L'enregistreur écrit ses enregistrements par segments de 10 s : un clip demandé trop tôt après la fin de l'événement
// est tronqué. On attend ce délai après la fin avant de copier.
const CLIP_SETTLE_SECONDS = 20

const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`)

// Le journal des lampes Hue : l'écoute du flux d'événements du pont, gardée dans la table hue_events (hueLog.ts).
// Il lui faut l'adresse du pont et sa clé d'application (HUE_BRIDGE_IP et HUE_APP_KEY) ; sans l'une, il reste inactif.
const hueLog = createHueLog(db, {
  address: process.env.HUE_BRIDGE_IP ?? '',
  key: process.env.HUE_APP_KEY ?? '',
  days: Number(process.env.HUE_LOG_DAYS ?? 365),
  log,
})

// Requête vers un enregistreur (un conteneur motion) : réseau Docker interne, sans mot de passe, jamais publié.
// Une requête qui ne finit pas (une caméra éteinte laisse l'image en attente) est coupée : sans ça, elle figerait le tour entier.
const REQUEST_TIMEOUT_MS = 15_000
const CLIP_TIMEOUT_MS = 120_000
const recorderAt = (base: string, path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> =>
  fetch(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs) })

// Quel enregistreur gère quelle caméra : rempli à chaque tour par syncCameras, lu pour copier un clip ou une image.
const recorderOf = new Map<string, string>()
const recorder = (camera: string, path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> => {
  const base = recorderOf.get(camera)
  if (!base) return Promise.resolve(new Response(null, { status: 503 }))
  return recorderAt(base, path, timeoutMs)
}

// Pour chaque caméra de chaque enregistreur : l'adresse de sa dernière image et celle de la page du direct (le go2rtc
// de son enregistreur), avec le premier flux « live » déclaré dans la configuration, ou le nom de la caméra à défaut.
// Un enregistreur qui ne répond pas est signalé, sans empêcher les autres.
const syncCameras = async (): Promise<Map<string, string[]>> => {
  const byRecorder = new Map<string, string[]>()
  for (const base of RECORDERS) {
    try {
      const res = await recorderAt(base, '/api/config')
      if (!res.ok) throw new Error(`config : HTTP ${res.status}`)
      const config = (await res.json()) as RecorderConfig
      const cameras: string[] = []
      for (const [camera, cam] of Object.entries(config.cameras)) {
        if (!/^[\w-]+$/.test(camera)) continue
        const stream = Object.values(cam.live?.streams ?? {})[0] ?? camera
        const go2rtc = (cam.live?.go2rtc ?? base).replace(/\/$/, '')
        recorderOf.set(camera, base)
        upsertImage.run(camera, `${base}/api/${camera}/latest.jpg`)
        upsertLive.run(camera, `${go2rtc}/live?src=${stream}`)
        cameras.push(camera)
      }
      byRecorder.set(base, cameras)
    } catch (error) {
      log(`Enregistreur ${base} : ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return byRecorder
}

// Une image par caméra toutes les SNAPSHOT_INTERVAL_SECONDS, dans snapshots/<caméra>/<horodatage>.jpg,
// puis le ménage des images plus vieilles que SNAPSHOT_RETENTION_DAYS (fichiers et lignes).
const lastSnapshotAt = new Map<string, number>()
let lastCleanAt = 0
const syncSnapshots = async (cameras: string[]) => {
  const now = Math.floor(Date.now() / 1000)
  let taken = 0
  for (const camera of cameras) {
    // Chaque caméra a son rythme (réglé depuis la page).
    if (now - (lastSnapshotAt.get(camera) ?? 0) < cameraSettings(camera).snapshot_seconds) continue
    lastSnapshotAt.set(camera, now)
    // Une caméra qui ne répond pas ne doit pas priver les autres de leur image.
    const image = await recorder(camera, `/api/${camera}/latest.jpg?h=${SNAPSHOT_HEIGHT}`)
      .then(async (res) => (res.ok ? Buffer.from(await res.arrayBuffer()) : null))
      .catch(() => null)
    if (!image) continue
    mkdirSync(`${DATA_DIR}/snapshots/${camera}`, { recursive: true })
    const path = `snapshots/${camera}/${now}.jpg`
    await writeFile(`${DATA_DIR}/${path}`, image)
    insertSnapshot.run(camera, now, path)
    taken += 1
  }
  if (now - lastCleanAt < 60) return taken
  lastCleanAt = now
  const limit = now - SNAPSHOT_RETENTION_DAYS * 86400
  for (const row of oldSnapshots.all(limit) as { camera: string; taken_at: number; path: string }[]) {
    await unlink(`${DATA_DIR}/${row.path}`).catch(() => undefined)
    deleteSnapshot.run(row.camera, row.taken_at)
  }
  return taken
}

type CopiedClip = { path: string; start: number | null }

// Écrit la réponse dans un fichier : en flux (un clip 4K ne tient pas tout entier en mémoire), dans un fichier temporaire renommé à la fin
// (une coupure ne laisse jamais un clip tronqué sous son vrai nom).
const saveResponse = async (res: Response, path: string) => {
  if (!res.body) throw new Error('réponse sans corps')
  const partial = `${path}.part`
  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(partial))
    await rename(partial, path)
  } catch (error) {
    await unlink(partial).catch(() => undefined)
    throw error
  }
}

// Copie le clip d'un événement dans DATA_DIR/clips/<caméra>/<id>.mp4 et renvoie ce chemin relatif et le début réel du clip.
// Trop tôt après la fin de l'événement (segments pas tous écrits), on ne copie pas : la reprise le fera.
const copyClip = async (event: RecorderEvent): Promise<CopiedClip | null> => {
  // L'identifiant sert de nom de fichier : rien d'autre que des caractères sûrs.
  if (!/^[\w.-]+$/.test(event.id) || !/^[\w-]+$/.test(event.camera)) return null
  // Clips désactivés pour cette caméra (réglage de la page) : l'événement est gardé, sans vidéo.
  if (!keepsClip(event.camera, event.start_time)) return null
  if (event.end_time !== null && Date.now() / 1000 - event.end_time < CLIP_SETTLE_SECONDS) return null
  // Un clip qui n'arrive pas (délai, coupure, disque) est sauté et sera retenté : il ne doit pas bloquer le tour des autres.
  try {
    const res = await recorder(event.camera, `/api/events/${event.id}/clip.mp4`, CLIP_TIMEOUT_MS)
    if (!res.ok) {
      log(`Clip ${event.id} indisponible (HTTP ${res.status})`)
      return null
    }
    mkdirSync(`${DATA_DIR}/clips/${event.camera}`, { recursive: true })
    const path = `clips/${event.camera}/${event.id}.mp4`
    await saveResponse(res, `${DATA_DIR}/${path}`)
    const start = Number(res.headers.get('X-Clip-Start'))
    return { path, start: Number.isFinite(start) && start > 0 ? start : null }
  } catch (error) {
    log(`Clip ${event.id} non copié : ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

// Les événements terminés qui ont un clip depuis un instant, par pages du plus récent au plus ancien :
// après une coupure, il peut y en avoir plus qu'une page, et aucun ne doit sauter.
const MAX_PAGES = 20
const fetchEventsSince = async (base: string, after: number): Promise<RecorderEvent[]> => {
  const all: RecorderEvent[] = []
  let before = ''
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await recorderAt(base, `/api/events?after=${after}${before}&has_clip=1&in_progress=0&limit=${EVENTS_PER_POLL}`)
    if (!res.ok) throw new Error(`events : HTTP ${res.status}`)
    const events = (await res.json()) as RecorderEvent[]
    all.push(...events)
    if (events.length < EVENTS_PER_POLL) break
    before = `&before=${events[events.length - 1].start_time}`
    if (page === MAX_PAGES - 1) log(`Plus de ${MAX_PAGES * EVENTS_PER_POLL} événements à rattraper : les plus anciens attendront`)
  }
  return all
}

// Les événements terminés qui ont un clip, du plus ancien au plus récent, en ignorant ceux déjà complets ;
// un événement connu « en cours » est complété (fin et clip) quand l'enregistreur le donne terminé.
const syncEvents = async (base: string, cameras: string[]) => {
  // Le dernier événement connu de CET enregistreur : un enregistreur arrêté un moment rattrape ses événements.
  const starts = lastStarts.all() as { camera: string; t: number }[]
  const latest = Math.max(0, ...starts.filter((row) => cameras.includes(row.camera)).map((row) => row.t))
  const after = Math.max(0, latest - LOOK_BACK_SECONDS)
  const events = (await fetchEventsSince(base, after)).reverse()
  let copied = 0
  for (const event of events) {
    const known = findEvent.get(event.id) as { ended_at: number | null } | undefined
    if (known && known.ended_at !== null) continue
    const clip = await copyClip(event)
    upsertEvent.run(
      event.id,
      event.camera,
      event.label,
      Math.floor(event.start_time),
      event.end_time === null ? null : Math.floor(event.end_time),
      clip?.path ?? null,
      clip?.start ?? null,
    )
    copied += 1
  }
  return copied
}

// La détection de mouvement suit les clips : quand ceux d'une caméra ne sont pas gardés (jamais, ou hors de la nuit), l'enregistreur
// ne la surveille plus (un mouvement sans clip n'a pas d'intérêt, et le décodage du flux coûte du processeur). On le lui dit quand
// l'état change, et toutes les minutes au cas où il aurait redémarré (il allume la détection par défaut).
const DETECTION_REFRESH_SECONDS = 60
const detectionSent = new Map<string, { enabled: boolean; at: number }>()
// La sensibilité de la détection : envoyée de la même façon (quand elle change, et chaque minute au cas où l'enregistreur aurait redémarré).
const sensitivitySent = new Map<string, { level: number; at: number }>()
// La zone surveillée de chaque caméra (un polygone dessiné dans la WebApp, lu dans le fichier de l'API) : envoyée aussi quand elle change et chaque minute.
const ZONES_FILE = process.env.ZONES_FILE ?? '/house/zones.json'
const zoneSent = new Map<string, { zone: string; at: number }>()
const syncDetection = async (base: string, cameras: string[]) => {
  const now = Math.floor(Date.now() / 1000)
  // null (fichier illisible) : on ne change rien, l'enregistreur garde sa zone.
  const zones = await readZones(ZONES_FILE)
  for (const camera of cameras) {
    const enabled = keepsClip(camera, now)
    const sent = detectionSent.get(camera)
    if (!sent || sent.enabled !== enabled || now - sent.at >= DETECTION_REFRESH_SECONDS) {
      const res = await fetch(`${base}/api/cameras/${camera}/detection?enabled=${enabled ? 1 : 0}`, { method: 'PUT', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null)
      if (res?.ok) detectionSent.set(camera, { enabled, at: now })
    }
    const level = cameraSettings(camera).motion_sensitivity
    const levelSent = sensitivitySent.get(camera)
    if (!levelSent || levelSent.level !== level || now - levelSent.at >= DETECTION_REFRESH_SECONDS) {
      const res = await fetch(`${base}/api/cameras/${camera}/sensitivity?level=${level}`, { method: 'PUT', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(() => null)
      if (res?.ok) sensitivitySent.set(camera, { level, at: now })
    }
    if (zones) {
      const points = zones[camera] ?? null
      const zone = JSON.stringify(points)
      const zoneAt = zoneSent.get(camera)
      if (!zoneAt || zoneAt.zone !== zone || now - zoneAt.at >= DETECTION_REFRESH_SECONDS) {
        const res = await fetch(`${base}/api/cameras/${camera}/zone`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }).catch(() => null)
        if (res?.ok) zoneSent.set(camera, { zone, at: now })
      }
    }
  }
}

// La cadence du direct 4K de chaque caméra : go2rtc fabrique <nom>_main_mjpeg avec ffmpeg:<nom>_main#video=mjpegN (modèles de
// go2rtc.yaml). On lui change la source à chaud (PATCH, en mémoire) quand le curseur bouge, et on vérifie chaque minute qu'elle est
// bonne (go2rtc qui redémarre revient à 25 images par seconde). Changer la source coupe le direct 4K en cours : il reprend seul.
const GO2RTC_URL = (process.env.GO2RTC_URL ?? 'http://go2rtc:1984').replace(/\/$/, '')
const LIVE_FPS_CHECK_SECONDS = 60
const liveFpsCheckedAt = new Map<string, number>()
const syncLiveFps = async (cameras: string[]) => {
  const now = Math.floor(Date.now() / 1000)
  const group = cameras.join(',')
  if (now - (liveFpsCheckedAt.get(group) ?? 0) < LIVE_FPS_CHECK_SECONDS) return
  liveFpsCheckedAt.set(group, now)
  for (const camera of cameras) {
    const settings = cameraSettings(camera)
    for (const { name, source, fps: wanted, label } of [
      { name: `${camera}_main_mjpeg`, source: `${camera}_main`, fps: settings.live_fps, label: 'Direct 4K' },
      { name: `${camera}_sub_mjpeg`, source: `${camera}_sub`, fps: settings.light_fps, label: 'Direct léger' },
      // Les flux des écrans de moins de 1024 px : « _m » (voir go2rtc.yaml).
      { name: `${camera}_main_mjpeg_m`, source: `${camera}_main`, fps: settings.live_fps_mobile, label: 'Direct 4K (téléphone)' },
      { name: `${camera}_sub_mjpeg_m`, source: `${camera}_sub`, fps: settings.light_fps_mobile, label: 'Direct léger (téléphone)' },
      // Les flux de la page invité : une seule cadence pour tous (PC et téléphone), voir plus bas.
      { name: `${camera}_guest_main_mjpeg`, source: `${camera}_main`, fps: guestFps(), label: 'Page invité 4K' },
      { name: `${camera}_guest_sub_mjpeg`, source: `${camera}_sub`, fps: guestFps(), label: 'Page invité léger' },
    ]) {
      try {
        const info = await fetch(`${GO2RTC_URL}/api/streams?src=${name}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
        if (!info.ok) continue
        const current = /video(?:=|%3D)mjpeg(\d+)/.exec(await info.text())
        if (Number(current?.[1] ?? MAX_LIVE_FPS) === wanted) continue
        const video = wanted >= MAX_LIVE_FPS ? 'mjpeg' : `mjpeg${wanted}`
        const res = await fetch(`${GO2RTC_URL}/api/streams?name=${name}&src=${encodeURIComponent(`ffmpeg:${source}#video=${video}`)}`, { method: 'PATCH', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
        log(`${label} de ${camera} : ${wanted} images/s (go2rtc : HTTP ${res.status})`)
        if (!res.ok) liveFpsCheckedAt.delete(group)
      } catch {
        // go2rtc ne répond pas : on réessaie au prochain tour.
      }
    }
  }
}

// Les événements en cours chez l'enregistreur (quelqu'un est encore dans le champ) : une ligne sans fin ni clip, pour que
// la frise les montre tout de suite. Une ligne en cours que l'enregistreur ne connaît plus est terminée ou effacée.
const syncOngoingEvents = async (base: string, cameras: string[]) => {
  const res = await recorderAt(base, `/api/events?in_progress=1&limit=${EVENTS_PER_POLL}`)
  if (!res.ok) throw new Error(`events in progress : HTTP ${res.status}`)
  const ongoing = (await res.json()) as RecorderEvent[]
  const ongoingIds = new Set(ongoing.map((event) => event.id))
  for (const event of ongoing) {
    if (findEvent.get(event.id)) continue
    upsertEvent.run(event.id, event.camera, event.label, Math.floor(event.start_time), null, null, null)
  }
  for (const row of openEvents.all() as { id: string; camera: string }[]) {
    if (!cameras.includes(row.camera) || ongoingIds.has(row.id)) continue
    const detail = await recorderAt(base, `/api/events/${row.id}`)
    if (detail.status === 404) {
      deleteEvent.run(row.id)
      continue
    }
    if (!detail.ok) continue
    const event = (await detail.json()) as RecorderEvent
    if (event.end_time === null) continue
    const clip = event.has_clip ? await copyClip(event) : null
    upsertEvent.run(event.id, event.camera, event.label, Math.floor(event.start_time), Math.floor(event.end_time), clip?.path ?? null, clip?.start ?? null)
  }
  return ongoing.length
}

// Les événements fusionnés par l'enregistreur (des clips qui se recouvraient, réunis en un seul 30 min après) : l'absorbé
// disparaît de la base et du disque, le survivant reçoit sa nouvelle fin, son nouveau clip et sa nouvelle copie légère.
const MERGE_LOOK_BACK_SECONDS = 6 * 3600
const syncMerges = async (base: string, cameras: string[]) => {
  const res = await recorderAt(base, `/api/events?merged_after=${Math.floor(Date.now() / 1000) - MERGE_LOOK_BACK_SECONDS}&limit=10000`)
  if (!res.ok) throw new Error(`events fusionnés : HTTP ${res.status}`)
  let changed = 0
  for (const event of (await res.json()) as RecorderEvent[]) {
    if (!cameras.includes(event.camera) || !/^[\w.-]+$/.test(event.id)) continue
    const known = findEvent.get(event.id) as { ended_at: number | null } | undefined
    if (event.merged_into !== undefined) {
      if (!known) continue
      insertMerge.run(event.id, event.merged_into, event.camera, Math.floor(event.start_time), event.end_time === null ? null : Math.floor(event.end_time), Math.floor(event.merged_at ?? Date.now() / 1000))
      deleteEvent.run(event.id)
      for (const suffix of ['.mp4', '.h264.mp4', '.aac']) await unlink(`${DATA_DIR}/clips/${event.camera}/${event.id}${suffix}`).catch(() => undefined)
      changed += 1
      continue
    }
    if (!known || !event.has_clip || event.end_time === null || (known.ended_at !== null && known.ended_at >= Math.floor(event.end_time))) continue
    const clip = await copyClip(event)
    if (!clip) continue
    upsertEvent.run(event.id, event.camera, event.label, Math.floor(event.start_time), Math.floor(event.end_time), clip.path, clip.start)
    clearWebClip.run(event.id)
    clearAudioClip.run(event.id)
    changed += 1
  }
  return changed
}

// Les événements enregistrés sans clip (l'enregistreur ne l'avait pas encore fini) : on retente la copie.
const retryMissingClips = async () => {
  const now = Math.floor(Date.now() / 1000)
  let repaired = 0
  const rows = eventsWithoutClip.all(now - CLIP_SETTLE_SECONDS, now - CLIP_RETRY_SECONDS) as (Omit<RecorderEvent, 'has_clip' | 'start_time' | 'end_time'> & { started_at: number; ended_at: number })[]
  for (const row of rows) {
    const clip = await copyClip({ ...row, has_clip: true, start_time: row.started_at, end_time: row.ended_at })
    if (!clip) continue
    updateClip.run(clip.path, clip.start, row.id)
    repaired += 1
  }
  return repaired
}

// La copie légère (H.264 720p) des clips copiés : l'enregistreur la fabrique après le clip, on la récupère dès qu'elle existe
// (et tant qu'il garde le clip). Les clips plus anciens n'en ont pas (voir sync/CLAUDE.md).
const syncWebClips = async () => {
  const now = Math.floor(Date.now() / 1000)
  let copied = 0
  for (const row of clipsWithoutWeb.all(now - CLIP_RETRY_SECONDS) as { id: string; camera: string; clip_path: string }[]) {
    if (!/^[\w.-]+$/.test(row.id) || !/^[\w-]+$/.test(row.camera)) continue
    try {
      const res = await recorder(row.camera, `/api/events/${row.id}/clip.h264.mp4`, CLIP_TIMEOUT_MS)
      if (!res.ok) continue
      const path = row.clip_path.replace(/\.mp4$/, '.h264.mp4')
      await saveResponse(res, `${DATA_DIR}/${path}`)
      updateWebClip.run(path, row.id)
      copied += 1
    } catch (error) {
      log(`Copie légère ${row.id} non copiée : ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return copied
}

// Le son des clips (<id>.aac, à part de la vidéo) : l'enregistreur le fabrique avec le clip pour ses caméras à son (AUDIO_CAMERAS). On le récupère
// une fois la copie légère faite. Un clip sans son (caméra sans micro, clip d'avant) répond 404 : on ne le redemande plus jusqu'au prochain démarrage.
const noAudio = new Set<string>()
const syncAudioClips = async () => {
  const now = Math.floor(Date.now() / 1000)
  let copied = 0
  for (const row of clipsWithoutAudio.all(now - CLIP_RETRY_SECONDS) as { id: string; camera: string; clip_path: string }[]) {
    if (noAudio.has(row.id) || !/^[\w.-]+$/.test(row.id) || !/^[\w-]+$/.test(row.camera)) continue
    try {
      const res = await recorder(row.camera, `/api/events/${row.id}/clip.aac`, CLIP_TIMEOUT_MS)
      if (res.status === 404) {
        noAudio.add(row.id)
        void res.body?.cancel().catch(() => undefined)
        continue
      }
      if (!res.ok) continue
      const path = row.clip_path.replace(/\.mp4$/, '.aac')
      await saveResponse(res, `${DATA_DIR}/${path}`)
      updateAudioClip.run(path, row.id)
      copied += 1
    } catch (error) {
      log(`Son ${row.id} non copié : ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return copied
}

// ---- La durée de garde des clips ----
// Un clip non sauvegardé est effacé du disque après CLIP_RETENTION_DAYS jours (réglable depuis la page : table app_settings, pour toutes les
// caméras) ; ceux que la WebApp a marqués « sauvegardé » (la liste est un fichier écrit par l'API) ne le sont jamais. L'événement reste
// dans la base (sans vidéo) : la frise garde sa trace. Rien n'est effacé si la liste des clips sauvegardés n'est pas lisible.
db.exec('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
const SAVED_CLIPS_FILE = process.env.SAVED_CLIPS_FILE ?? '/house/saved-clips.json'
const DEFAULT_RETENTION_DAYS = 15
const MIN_RETENTION_DAYS = 1
const MAX_RETENTION_DAYS = 3650
const PURGE_EVERY_SECONDS = 600
const retentionRow = db.prepare("SELECT value FROM app_settings WHERE key = 'clip_retention_days'")
const saveRetention = db.prepare("INSERT INTO app_settings (key, value) VALUES ('clip_retention_days', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
const clipRetentionDays = (): number => {
  const row = retentionRow.get() as { value: string } | undefined
  const days = Number(row?.value ?? process.env.CLIP_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS)
  return Number.isInteger(days) && days >= MIN_RETENTION_DAYS && days <= MAX_RETENTION_DAYS ? days : DEFAULT_RETENTION_DAYS
}
// La cadence de la page invité (guest/) : un seul réglage, le même pour les vignettes (flux léger) et la caméra agrandie (4K), PC et téléphone confondus.
const DEFAULT_GUEST_FPS = 2
const GUEST_STATE_FILE = process.env.GUEST_STATE_FILE ?? '/guest/state.json'
// Les visites de la page invité : la page les écrit dans un fichier (lecture seule ici), House Sync les importe toutes les 15 s dans la table guest_visits (onglet Base) et supprime les plus vieilles.
const GUEST_VISITS_FILE = process.env.GUEST_VISITS_FILE ?? '/guest-visits/visits.jsonl'
const GUEST_VISITS_DAYS = Number(process.env.GUEST_VISITS_DAYS ?? 365)
createGuestVisitsTable(db)
// Le plan de la maison : House API l'écrit dans un fichier (lecture seule ici), House Sync l'importe toutes les 30 s dans la table plan (onglet Base) quand il a changé.
const PLAN_FILE = process.env.PLAN_FILE ?? '/house/plan.json'
createPlanTable(db)
const syncPlan = async () => {
  try {
    const written = importPlan(db, await readPlan(PLAN_FILE))
    if (written > 0) log(`Plan de la maison : ${written} élément(s) enregistré(s)`)
  } catch (error) {
    log(`Plan de la maison : ${error instanceof Error ? error.message : String(error)}`)
  }
}
void syncPlan()
setInterval(() => void syncPlan(), 30_000)
let lastVisitsPurgeAt = 0
const syncGuestVisits = async () => {
  try {
    const imported = await importGuestVisits(db, GUEST_VISITS_FILE)
    if (imported > 0) log(`Page invité : ${imported} visite(s) notée(s)`)
    if (Date.now() - lastVisitsPurgeAt > 86_400_000) {
      lastVisitsPurgeAt = Date.now()
      const removed = purgeGuestVisits(db, GUEST_VISITS_DAYS)
      if (removed > 0) log(`Page invité : ${removed} visite(s) de plus de ${GUEST_VISITS_DAYS} jours supprimée(s)`)
    }
  } catch (error) {
    log(`Visites de la page invité : ${error instanceof Error ? error.message : String(error)}`)
  }
}
void syncGuestVisits()
setInterval(() => void syncGuestVisits(), 15_000)
const guestFpsRow = db.prepare("SELECT value FROM app_settings WHERE key = 'guest_fps'")
const saveGuestFps = db.prepare("INSERT INTO app_settings (key, value) VALUES ('guest_fps', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
const guestFps = (): number => {
  const row = guestFpsRow.get() as { value: string } | undefined
  const fps = Number(row?.value ?? DEFAULT_GUEST_FPS)
  return Number.isInteger(fps) && fps >= 1 && fps <= MAX_LIVE_FPS ? fps : DEFAULT_GUEST_FPS
}
const expiredClips = db.prepare('SELECT id, clip_path, clip_web_path, clip_audio_path FROM events WHERE clip_path IS NOT NULL AND ended_at IS NOT NULL AND ended_at < ?')
const clearClipPaths = db.prepare('UPDATE events SET clip_path = NULL, clip_web_path = NULL, clip_audio_path = NULL WHERE id = ?')
let lastPurgeAt = 0
const purgeOldClips = async (): Promise<number> => {
  const now = Math.floor(Date.now() / 1000)
  if (now - lastPurgeAt < PURGE_EVERY_SECONDS) return 0
  lastPurgeAt = now
  const saved = await readSavedIds(SAVED_CLIPS_FILE)
  if (!saved) {
    log('Ménage des clips sauté : la liste des clips sauvegardés est illisible')
    return 0
  }
  let purged = 0
  for (const row of expiredClips.all(now - clipRetentionDays() * 86400) as { id: string; clip_path: string; clip_web_path: string | null; clip_audio_path: string | null }[]) {
    if (saved.has(row.id)) continue
    let failed = false
    for (const path of [row.clip_path, row.clip_web_path, row.clip_audio_path]) {
      if (!path || !/^clips\/[\w-]+\/[\w.-]+\.(mp4|aac)$/.test(path)) continue
      await unlink(`${DATA_DIR}/${path}`).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') failed = true
      })
    }
    // Un fichier qui ne s'efface pas garde sa ligne : le prochain ménage réessaiera.
    if (failed) continue
    clearClipPaths.run(row.id)
    purged += 1
  }
  return purged
}

let busy = false
let stopping = false
const poll = async () => {
  if (busy || stopping) return
  busy = true
  try {
    const byRecorder = await syncCameras()
    const cameras = [...byRecorder.values()].flat()
    let copied = 0
    let ongoing = 0
    let merged = 0
    for (const [base, own] of byRecorder) {
      // Un enregistreur qui échoue ne bloque pas les autres.
      try {
        copied += await syncEvents(base, own)
        ongoing += await syncOngoingEvents(base, own)
        merged += await syncMerges(base, own)
        await syncDetection(base, own)
        await syncLiveFps(own)
      } catch (error) {
        log(`Enregistreur ${base} : ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const repaired = (await retryMissingClips()) + (await syncWebClips()) + (await syncAudioClips())
    const snapshots = await syncSnapshots(cameras)
    const purged = await purgeOldClips()
    log(
      `${cameras.length} caméra(s), ${copied} nouvel(aux) événement(s)${ongoing ? `, ${ongoing} en cours` : ''}${merged ? `, ${merged} fusionné(s)` : ''}${repaired ? `, ${repaired} clip(s) récupéré(s)` : ''}${snapshots ? `, ${snapshots} image(s)` : ''}${purged ? `, ${purged} vieux clip(s) effacé(s)` : ''}`,
    )
  } catch (error) {
    log(`Enregistreur : ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    busy = false
  }
}

// ---- La page de House Sync ----

// Les sessions : un cookie signé avec la clé et daté (session.ts), rien en mémoire.
const hasSession = (token: string): boolean => HOUSE_KEY.length >= MIN_KEY_LENGTH && isValidToken(HOUSE_KEY, token, Math.floor(Date.now() / 1000))

/** Les essais de clé ratés sur la page : 10 par adresse et par 15 minutes, puis 429. */
const loginAttempts = createAttemptLimiter()

const hasValidKey = (given: string): boolean => {
  const a = Buffer.from(given)
  const b = Buffer.from(HOUSE_KEY)
  return HOUSE_KEY.length >= MIN_KEY_LENGTH && a.length === b.length && timingSafeEqual(a, b)
}

const sessionOf = (req: IncomingMessage): string => {
  const cookie = (req.headers.cookie ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  return cookie ? cookie.slice(SESSION_COOKIE.length + 1) : ''
}

// Les fichiers de la page React compilée (dossier web), publics : les données, elles, sont derrière la session.
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}
const sendStatic = async (res: ServerResponse, pathname: string) => {
  const file = resolve(WEB_DIR, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (!file.startsWith(WEB_DIR + sep)) return sendJson(res, 404, { error: 'not found' })
  try {
    const content = await readFile(file)
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(content)
  } catch {
    sendJson(res, 404, { error: 'not found' })
  }
}

// Un clip ou une image du disque backup : seulement clips/<caméra>/<id>.mp4 ou snapshots/<caméra>/<t>.jpg.
const BACKUP_FILE = /^\/files\/((?:clips\/[\w-]+\/[\w.-]+\.mp4)|(?:snapshots\/[\w-]+\/\d+\.jpg))$/
// Un fichier du disque backup, par morceaux si le navigateur le demande (Range) : un téléphone lit la vidéo sans la
// télécharger en entier et s'y déplace ; sans cela, il attend les 30 Mo (et l'iPhone refuse).
const sendBackupFile = async (res: ServerResponse, relativePath: string, rangeHeader: string | undefined) => {
  try {
    const path = `${DATA_DIR}/${relativePath}`
    const { size } = await stat(path)
    const type = relativePath.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4'
    const range = parseRange(rangeHeader, size)
    if (range === 'invalid') {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` })
      return void res.end()
    }
    if (range) {
      res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${range.start}-${range.end}/${size}`, 'Content-Length': range.end - range.start + 1 })
      return await pipeline(createReadStream(path, { start: range.start, end: range.end }), res)
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size })
    await pipeline(createReadStream(path), res)
  } catch {
    // Avant l'en-tête : introuvable ; après (lecture coupée, client parti) : on ferme, il n'y a plus rien à dire.
    if (res.headersSent) res.destroy()
    else sendJson(res, 404, { error: 'not found' })
  }
}

// Ce que la page affiche : la base (tables, nombre de lignes, taille) et le disque backup (clips, images par minute). Sans `full`, le disque backup
// n'est pas parcouru (des milliers de fichiers) : seuls le chemin et la base sont rendus, les chiffres du disque sont à zéro.
const overview = async (full = true) => {
  const files = full ? await listBackup(DATA_DIR) : []
  const clips = files.filter((f) => f.path.startsWith('clips/'))
  const snapshots = files.filter((f) => f.path.startsWith('snapshots/'))
  const dbSize = await stat(`${DATA_DIR}/events.db`).then((s) => s.size).catch(() => 0)
  const disk = full ? await readDiskSpace(DATA_DIR) : { total: 0, free: 0, reserved: 0 }
  return {
    database: { path: `${DATA_DIR}/events.db`, size: dbSize, tables: summarizeTables(db) },
    backup: {
      path: DATA_DIR,
      clips: { count: clips.length, size: sumSize(clips) },
      snapshots: { count: snapshots.length, size: sumSize(snapshots) },
      disk,
    },
  }
}

// Les services derrière la session : vue d'ensemble, une page d'une table, une page des clips, un fichier.
const service = async (res: ServerResponse, pathname: string, params: URLSearchParams, rangeHeader: string | undefined) => {
  if (pathname === '/api/retention') return sendJson(res, 200, { clip_retention_days: clipRetentionDays() })
  if (pathname === '/api/guest') return sendJson(res, 200, { guest_fps: guestFps(), guest_enabled: await readGuestEnabled(GUEST_STATE_FILE) })
  if (pathname === '/api/settings') return sendJson(res, 200, (knownCameras.all() as { camera: string }[]).map((row) => cameraSettings(row.camera)))
  if (pathname === '/api/overview') return sendJson(res, 200, await overview(params.get('part') !== 'database'))
  if (pathname === '/api/docker') return sendJson(res, 200, await readDocker(DOCKER_FILE, COMPOSE_FILE))
  if (pathname === '/api/specs') return sendJson(res, 200, await readSpecs())
  if (pathname === '/api/hue') return sendJson(res, 200, await readHueBridge())
  if (pathname === '/api/hue-log') return sendJson(res, 200, hueLog.list(params))
  if (pathname === '/api/network') return sendJson(res, 200, await readNetwork())
  if (pathname === '/api/system') return sendJson(res, 200, await readSystem())
  if (pathname === '/api/power') return sendJson(res, 200, await readPower(POWER_FILE, apiTarget()))
  if (pathname === '/api/table') {
    const { page, size } = pageParams(params)
    const result = readTable(db, params.get('name') ?? '', page, size, filterParams(params))
    return result ? sendJson(res, 200, result) : sendJson(res, 404, { error: 'unknown table' })
  }
  if (pathname === '/api/clips') {
    const { page, size } = pageParams(params)
    const all = groupClips((await listBackup(DATA_DIR)).filter((f) => f.path.startsWith('clips/')))
    const wanted = clipFilterParams(params)
    // Sauvegardés ou non : la liste écrite par l'API ; illisible, elle compte pour vide (rien n'est montré comme sauvegardé).
    const saved = wanted.saved ? { ids: (await readSavedIds(SAVED_CLIPS_FILE)) ?? new Set<string>(), keep: wanted.saved === 'saved' } : undefined
    const shown = filterClips(all, { camera: wanted.camera, from: wanted.from, to: wanted.to, saved })
    return sendJson(res, 200, { ...paginate(shown, page, size), cameras: clipCameras(all) })
  }
  const file = BACKUP_FILE.exec(pathname)
  if (file) return sendBackupFile(res, file[1], rangeHeader)
  sendJson(res, 404, { error: 'not found' })
}

const route = async (req: IncomingMessage, res: ServerResponse) => {
  const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'POST' && pathname === '/login') {
    const ip = req.socket.remoteAddress ?? ''
    if (loginAttempts.isBlocked(ip)) return sendJson(res, 429, { error: 'too many attempts' })
    // La clé arrive en JSON ({ key }) ; la session est un cookie signé de 30 jours, la clé n'est pas gardée par le navigateur.
    const login = await readJsonObject(req)
    const key = typeof login?.key === 'string' ? login.key : ''
    if (!hasValidKey(key)) {
      loginAttempts.fail(ip)
      return sendJson(res, 401, { error: 'invalid key' })
    }
    loginAttempts.clear(ip)
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(SESSION_COOKIE, createToken(HOUSE_KEY, Math.floor(Date.now() / 1000))) })
  }
  if (req.method === 'POST' && pathname === '/logout') {
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(SESSION_COOKIE, '') })
  }
  // PUT /api/settings : { camera, clips_mode?, live_fps?, light_fps?, live_fps_mobile?, light_fps_mobile?, motion_sensitivity?, snapshot_seconds? }, derrière la session.
  if (req.method === 'PUT' && pathname === '/api/settings') {
    if (!hasSession(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
    const body = await readJsonObject(req)
    if (!body) return sendJson(res, 400, { error: 'invalid JSON' })
    const camera = typeof body.camera === 'string' ? body.camera : ''
    if (!(knownCameras.all() as { camera: string }[]).some((row) => row.camera === camera)) return sendJson(res, 404, { error: 'unknown camera' })
    const current = cameraSettings(camera)
    const mode = body.clips_mode === undefined ? current.clips_mode : body.clips_mode
    if (typeof mode !== 'string' || !CLIP_MODES.includes(mode)) return sendJson(res, 400, { error: `clips_mode must be one of ${CLIP_MODES.join(', ')}` })
    const seconds = body.snapshot_seconds === undefined ? current.snapshot_seconds : body.snapshot_seconds
    if (typeof seconds !== 'number' || !SNAPSHOT_CHOICES.includes(seconds)) return sendJson(res, 400, { error: `snapshot_seconds must be one of ${SNAPSHOT_CHOICES.join(', ')}` })
    const fps = intSetting(body.live_fps, current.live_fps, 1, MAX_LIVE_FPS)
    if (fps === null) return sendJson(res, 400, { error: `live_fps must be an integer from 1 to ${MAX_LIVE_FPS}` })
    const light = intSetting(body.light_fps, current.light_fps, 1, MAX_LIVE_FPS)
    if (light === null) return sendJson(res, 400, { error: `light_fps must be an integer from 1 to ${MAX_LIVE_FPS}` })
    const fpsMobile = intSetting(body.live_fps_mobile, current.live_fps_mobile, 1, MAX_LIVE_FPS)
    if (fpsMobile === null) return sendJson(res, 400, { error: `live_fps_mobile must be an integer from 1 to ${MAX_LIVE_FPS}` })
    const lightMobile = intSetting(body.light_fps_mobile, current.light_fps_mobile, 1, MAX_LIVE_FPS)
    if (lightMobile === null) return sendJson(res, 400, { error: `light_fps_mobile must be an integer from 1 to ${MAX_LIVE_FPS}` })
    const sensitivity = intSetting(body.motion_sensitivity, current.motion_sensitivity, MIN_SENSITIVITY, MAX_SENSITIVITY)
    if (sensitivity === null) return sendJson(res, 400, { error: `motion_sensitivity must be an integer from ${MIN_SENSITIVITY} to ${MAX_SENSITIVITY}` })
    saveSettings.run(camera, mode === 'off' ? 0 : 1, mode, fps, light, fpsMobile, lightMobile, sensitivity, seconds)
    log(`Réglages de ${camera} : clips ${mode}, direct 4K à ${fps} images/s (téléphone ${fpsMobile}), léger à ${light} (téléphone ${lightMobile}), sensibilité du mouvement ${sensitivity}, une image toutes les ${seconds} s`)
    liveFpsCheckedAt.clear()
    return sendJson(res, 200, cameraSettings(camera))
  }
  // PUT /api/retention : { clip_retention_days } (de 1 à 3650), la durée de garde des clips non sauvegardés, pour toutes les caméras.
  if (req.method === 'PUT' && pathname === '/api/retention') {
    if (!hasSession(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
    const body = await readJsonObject(req)
    if (!body) return sendJson(res, 400, { error: 'invalid JSON' })
    const days = intSetting(body.clip_retention_days, clipRetentionDays(), MIN_RETENTION_DAYS, MAX_RETENTION_DAYS)
    if (days === null) return sendJson(res, 400, { error: `clip_retention_days must be an integer from ${MIN_RETENTION_DAYS} to ${MAX_RETENTION_DAYS}` })
    saveRetention.run(String(days))
    log(`Durée de garde des clips : ${days} jours`)
    return sendJson(res, 200, { clip_retention_days: days })
  }
  // PUT /api/guest : { guest_fps?, guest_enabled? } : les images par seconde de la page invité (de 1 à 25 ; vignettes et 4K, PC et téléphone, toutes les caméras) et son interrupteur (false : elle ferme son port).
  if (req.method === 'PUT' && pathname === '/api/guest') {
    if (!hasSession(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
    const body = await readJsonObject(req)
    if (!body) return sendJson(res, 400, { error: 'invalid JSON' })
    const fps = intSetting(body.guest_fps, guestFps(), 1, MAX_LIVE_FPS)
    if (fps === null) return sendJson(res, 400, { error: `guest_fps must be an integer from 1 to ${MAX_LIVE_FPS}` })
    if (body.guest_enabled !== undefined && typeof body.guest_enabled !== 'boolean') return sendJson(res, 400, { error: 'guest_enabled must be a boolean' })
    if (typeof body.guest_enabled === 'boolean') {
      try {
        await writeGuestEnabled(GUEST_STATE_FILE, body.guest_enabled)
      } catch {
        return sendJson(res, 500, { error: 'guest state not written' })
      }
      log(`Page invité : ${body.guest_enabled ? 'en ligne' : 'coupée'}`)
    }
    saveGuestFps.run(String(fps))
    liveFpsCheckedAt.clear()
    if (body.guest_fps !== undefined) log(`Page invité : ${fps} images/s`)
    return sendJson(res, 200, { guest_fps: fps, guest_enabled: await readGuestEnabled(GUEST_STATE_FILE) })
  }
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' })
  if (pathname.startsWith('/api/') || pathname.startsWith('/files/')) {
    if (!hasSession(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
    return service(res, pathname, searchParams, req.headers.range)
  }
  sendStatic(res, pathname)
}

// Une erreur dans une requête (fichier système illisible, base occupée…) répond 500 et reste dans le journal : elle ne doit pas arrêter House Sync.
const handlePage = (req: IncomingMessage, res: ServerResponse) => {
  route(req, res).catch((error: unknown) => {
    log(`Page : ${error instanceof Error ? error.message : String(error)}`)
    if (res.headersSent) res.destroy()
    else sendJson(res, 500, { error: 'internal error' })
  })
}

const secure = existsSync(TLS_CERT) && existsSync(TLS_KEY)
const page = secure ? createHttpsServer({ cert: readFileSync(TLS_CERT), key: readFileSync(TLS_KEY) }, handlePage) : createHttpServer(handlePage)
page.listen(PAGE_PORT, () => log(`Page de House Sync en ${secure ? 'HTTPS' : 'HTTP'} sur le port ${PAGE_PORT}`))

// ---- Le polling ----

log(`House Sync démarré (${DATA_DIR}/events.db, toutes les ${INTERVAL_MS / 1000} s)`)
hueLog.start()
await poll()
const timer = setInterval(poll, INTERVAL_MS)

const STOP_WAIT_MS = 5000
const stop = async () => {
  stopping = true
  clearInterval(timer)
  hueLog.stop()
  page.closeAllConnections()
  page.close()
  // Le tour de polling en cours finit avant la fermeture de la base (sinon ses écritures échouent).
  for (let waited = 0; busy && waited < STOP_WAIT_MS; waited += 100) await new Promise((done) => setTimeout(done, 100))
  db.close()
  process.exit(0)
}
// Une promesse rejetée oubliée est notée dans le journal : elle ne tue pas House Sync.
process.on('unhandledRejection', (reason) => log(`Erreur non gérée : ${reason instanceof Error ? reason.message : String(reason)}`))
process.on('SIGTERM', () => void stop())
process.on('SIGINT', () => void stop())
