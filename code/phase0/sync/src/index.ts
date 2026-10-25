// House Sync : à intervalle régulier, il lit chez l'enregistreur (le conteneur motion) les caméras
// et les événements terminés, copie chaque clip sur le disque backup et écrit dans SQLite les événements,
// l'adresse de la dernière image et l'adresse iframe du direct de chaque caméra.
// Seul House Sync écrit dans cette base ; House API la lit. Il sert aussi sa propre page (port 8081, HTTPS,
// derrière la clé) qui montre la base et les fichiers du disque backup : l'API n'expose jamais la base brute.
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { extname, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { listBackup, pageParams, paginate, readTable, summarizeTables, sumSize } from './data.ts'

// L'enregistreur (conteneur motion) : son API est interne, sans mot de passe, jamais publiée.
const FRIGATE_URL = (process.env.RECORDER_URL ?? 'http://motion:8080').replace(/\/$/, '')
// La page de House Sync (une petite app React, dossier web) : sa clé (la même que l'API), son port et le certificat.
const HOUSE_KEY = process.env.HOUSE_KEY ?? ''
const PAGE_PORT = Number(process.env.PAGE_PORT ?? 8081)
const WEB_DIR = resolve(process.env.WEB_DIR ?? './web')
const TLS_CERT = process.env.TLS_CERT ?? ''
const TLS_KEY = process.env.TLS_KEY ?? ''
const SESSION_COOKIE = 'house_sync'
const DATA_DIR = process.env.DATA_DIR ?? './data'
const INTERVAL_MS = Number(process.env.POLL_INTERVAL_SECONDS ?? 30) * 1000
const EVENTS_PER_POLL = 50
// Un événement long peut se terminer après des événements plus récents : on relit une heure en arrière.
const LOOK_BACK_SECONDS = 3600
// L'enregistreur n'enregistre que sur mouvement : entre deux événements, il ne reste rien. House Sync garde donc
// une image par minute et par caméra (image du flux principal, 720 px de haut) pendant quelques jours.
const SNAPSHOT_INTERVAL_SECONDS = Number(process.env.SNAPSHOT_INTERVAL_SECONDS ?? 60)
const SNAPSHOT_RETENTION_DAYS = Number(process.env.SNAPSHOT_RETENTION_DAYS ?? 7)
const SNAPSHOT_HEIGHT = 720

type RecorderConfig = { cameras: Record<string, { live?: { streams?: Record<string, string> } }> }
type RecorderEvent = {
  id: string
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
    clip_started_at INTEGER
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
`)
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
if (!(db.prepare('PRAGMA table_info(events)').all() as { name: string }[]).some((column) => column.name === 'clip_started_at')) {
  db.exec('ALTER TABLE events ADD COLUMN clip_started_at INTEGER')
}
const findEvent = db.prepare('SELECT ended_at FROM events WHERE id = ?')
// Un événement en cours est inséré sans fin ni clip ; une fois terminé, la même ligne reçoit sa fin et son clip.
const upsertEvent = db.prepare(
  'INSERT INTO events (id, camera, label, started_at, ended_at, clip_path, clip_started_at) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET label = excluded.label, ended_at = excluded.ended_at, clip_path = excluded.clip_path, clip_started_at = excluded.clip_started_at',
)
const openEvents = db.prepare('SELECT id FROM events WHERE ended_at IS NULL')
const deleteEvent = db.prepare('DELETE FROM events WHERE id = ?')
const lastStart = db.prepare('SELECT MAX(started_at) AS t FROM events')
const eventsWithoutClip = db.prepare(
  'SELECT id, camera, label, started_at, ended_at FROM events WHERE clip_path IS NULL AND ended_at IS NOT NULL AND ended_at <= ? AND started_at > ?',
)
const updateClip = db.prepare('UPDATE events SET clip_path = ?, clip_started_at = ? WHERE id = ?')
// Un clip peut ne pas être prêt au moment de la copie : on réessaie tant que l'enregistreur garde ses enregistrements.
const CLIP_RETRY_SECONDS = 6 * 3600
// L'enregistreur écrit ses enregistrements par segments de 10 s : un clip demandé trop tôt après la fin de l'événement
// est tronqué. On attend ce délai après la fin avant de copier.
const CLIP_SETTLE_SECONDS = 20

const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`)

// Requête vers l'enregistreur (le conteneur motion) : réseau Docker interne, sans mot de passe, jamais publié.
const recorder = (path: string): Promise<Response> => fetch(`${FRIGATE_URL}${path}`)

// Pour chaque caméra de l'enregistreur : l'adresse de sa dernière image et celle de la page du direct (go2rtc),
// avec le premier flux « live » déclaré dans la configuration, ou le nom de la caméra à défaut.
const syncCameras = async () => {
  const res = await recorder('/api/config')
  if (!res.ok) throw new Error(`config : HTTP ${res.status}`)
  const config = (await res.json()) as RecorderConfig
  for (const [camera, cam] of Object.entries(config.cameras)) {
    const stream = Object.values(cam.live?.streams ?? {})[0] ?? camera
    upsertImage.run(camera, `${FRIGATE_URL}/api/${camera}/latest.jpg`)
    upsertLive.run(camera, `${FRIGATE_URL}/live?src=${stream}`)
  }
  return Object.keys(config.cameras).filter((camera) => /^[\w-]+$/.test(camera))
}

// Une image par caméra toutes les SNAPSHOT_INTERVAL_SECONDS, dans snapshots/<caméra>/<horodatage>.jpg,
// puis le ménage des images plus vieilles que SNAPSHOT_RETENTION_DAYS (fichiers et lignes).
let lastSnapshotAt = 0
const syncSnapshots = async (cameras: string[]) => {
  const now = Math.floor(Date.now() / 1000)
  if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_SECONDS) return 0
  lastSnapshotAt = now
  let taken = 0
  for (const camera of cameras) {
    const res = await recorder(`/api/${camera}/latest.jpg?h=${SNAPSHOT_HEIGHT}`)
    if (!res.ok) continue
    mkdirSync(`${DATA_DIR}/snapshots/${camera}`, { recursive: true })
    const path = `snapshots/${camera}/${now}.jpg`
    await writeFile(`${DATA_DIR}/${path}`, Buffer.from(await res.arrayBuffer()))
    insertSnapshot.run(camera, now, path)
    taken += 1
  }
  const limit = now - SNAPSHOT_RETENTION_DAYS * 86400
  for (const row of oldSnapshots.all(limit) as { camera: string; taken_at: number; path: string }[]) {
    await unlink(`${DATA_DIR}/${row.path}`).catch(() => undefined)
    deleteSnapshot.run(row.camera, row.taken_at)
  }
  return taken
}

type CopiedClip = { path: string; start: number | null }

// Copie le clip d'un événement dans DATA_DIR/clips/<caméra>/<id>.mp4 et renvoie ce chemin relatif et le début réel du clip.
// Trop tôt après la fin de l'événement (segments pas tous écrits), on ne copie pas : la reprise le fera.
const copyClip = async (event: RecorderEvent): Promise<CopiedClip | null> => {
  // L'identifiant sert de nom de fichier : rien d'autre que des caractères sûrs.
  if (!/^[\w.-]+$/.test(event.id) || !/^[\w-]+$/.test(event.camera)) return null
  if (event.end_time !== null && Date.now() / 1000 - event.end_time < CLIP_SETTLE_SECONDS) return null
  const res = await recorder(`/api/events/${event.id}/clip.mp4`)
  if (!res.ok) {
    log(`Clip ${event.id} indisponible (HTTP ${res.status})`)
    return null
  }
  mkdirSync(`${DATA_DIR}/clips/${event.camera}`, { recursive: true })
  const path = `clips/${event.camera}/${event.id}.mp4`
  await writeFile(`${DATA_DIR}/${path}`, Buffer.from(await res.arrayBuffer()))
  const start = Number(res.headers.get('X-Clip-Start'))
  return { path, start: Number.isFinite(start) && start > 0 ? start : null }
}

// Les événements terminés qui ont un clip depuis un instant, par pages du plus récent au plus ancien :
// après une coupure, il peut y en avoir plus qu'une page, et aucun ne doit sauter.
const MAX_PAGES = 20
const fetchEventsSince = async (after: number): Promise<RecorderEvent[]> => {
  const all: RecorderEvent[] = []
  let before = ''
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await recorder(`/api/events?after=${after}${before}&has_clip=1&in_progress=0&limit=${EVENTS_PER_POLL}`)
    if (!res.ok) throw new Error(`events : HTTP ${res.status}`)
    const events = (await res.json()) as RecorderEvent[]
    all.push(...events)
    if (events.length < EVENTS_PER_POLL) break
    before = `&before=${events[events.length - 1].start_time}`
  }
  return all
}

// Les événements terminés qui ont un clip, du plus ancien au plus récent, en ignorant ceux déjà complets ;
// un événement connu « en cours » est complété (fin et clip) quand l'enregistreur le donne terminé.
const syncEvents = async () => {
  const after = Math.max(0, Number((lastStart.get() as { t: number | null }).t ?? 0) - LOOK_BACK_SECONDS)
  const events = (await fetchEventsSince(after)).reverse()
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

// Les événements en cours chez l'enregistreur (quelqu'un est encore dans le champ) : une ligne sans fin ni clip, pour que
// la frise les montre tout de suite. Une ligne en cours que l'enregistreur ne connaît plus est terminée ou effacée.
const syncOngoingEvents = async () => {
  const res = await recorder(`/api/events?in_progress=1&limit=${EVENTS_PER_POLL}`)
  if (!res.ok) throw new Error(`events in progress : HTTP ${res.status}`)
  const ongoing = (await res.json()) as RecorderEvent[]
  const ongoingIds = new Set(ongoing.map((event) => event.id))
  for (const event of ongoing) {
    if (findEvent.get(event.id)) continue
    upsertEvent.run(event.id, event.camera, event.label, Math.floor(event.start_time), null, null, null)
  }
  for (const row of openEvents.all() as { id: string }[]) {
    if (ongoingIds.has(row.id)) continue
    const detail = await recorder(`/api/events/${row.id}`)
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

// Les événements enregistrés sans clip (l'enregistreur ne l'avait pas encore fini) : on retente la copie.
const retryMissingClips = async () => {
  const now = Math.floor(Date.now() / 1000)
  let repaired = 0
  const rows = eventsWithoutClip.all(now - CLIP_SETTLE_SECONDS, now - CLIP_RETRY_SECONDS) as Omit<RecorderEvent, 'has_clip' | 'start_time' | 'end_time'>[]
  for (const row of rows) {
    const clip = await copyClip({ ...row, has_clip: true, start_time: row.started_at, end_time: row.ended_at })
    if (!clip) continue
    updateClip.run(clip.path, clip.start, row.id)
    repaired += 1
  }
  return repaired
}

let busy = false
const poll = async () => {
  if (busy) return
  busy = true
  try {
    const cameras = await syncCameras()
    const copied = await syncEvents()
    const ongoing = await syncOngoingEvents()
    const repaired = await retryMissingClips()
    const snapshots = await syncSnapshots(cameras)
    log(
      `${cameras.length} caméra(s), ${copied} nouvel(aux) événement(s)${ongoing ? `, ${ongoing} en cours` : ''}${repaired ? `, ${repaired} clip(s) récupéré(s)` : ''}${snapshots ? `, ${snapshots} image(s)` : ''}`,
    )
  } catch (error) {
    log(`Enregistreur : ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    busy = false
  }
}

// ---- La page de House Sync ----

// Les sessions ouvertes avec la bonne clé : un jeton aléatoire par navigateur, en mémoire seulement.
const sessions = new Set<string>()

const hasValidKey = (given: string): boolean => {
  const a = Buffer.from(given)
  const b = Buffer.from(HOUSE_KEY)
  return HOUSE_KEY.length >= 8 && a.length === b.length && timingSafeEqual(a, b)
}

const sessionOf = (req: IncomingMessage): string => {
  const cookie = (req.headers.cookie ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  return cookie ? cookie.slice(SESSION_COOKIE.length + 1) : ''
}

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
  })

const sendJson = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  res.end(JSON.stringify(body))
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
const sendBackupFile = async (res: ServerResponse, relativePath: string) => {
  try {
    const { size } = await stat(`${DATA_DIR}/${relativePath}`)
    res.writeHead(200, { 'Content-Type': relativePath.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4', 'Content-Length': size })
    createReadStream(`${DATA_DIR}/${relativePath}`).pipe(res)
  } catch {
    sendJson(res, 404, { error: 'not found' })
  }
}

// Ce que la page affiche : la base (tables, nombre de lignes, taille) et le disque backup (clips, images par minute).
const overview = async () => {
  const files = await listBackup(DATA_DIR)
  const clips = files.filter((f) => f.path.startsWith('clips/'))
  const snapshots = files.filter((f) => f.path.startsWith('snapshots/'))
  const dbSize = await stat(`${DATA_DIR}/events.db`).then((s) => s.size).catch(() => 0)
  return {
    database: { path: `${DATA_DIR}/events.db`, size: dbSize, tables: summarizeTables(db) },
    backup: {
      path: DATA_DIR,
      clips: { count: clips.length, size: sumSize(clips) },
      snapshots: { count: snapshots.length, size: sumSize(snapshots) },
    },
  }
}

// Les services derrière la session : vue d'ensemble, une page d'une table, une page des clips, un fichier.
const service = async (res: ServerResponse, pathname: string, params: URLSearchParams) => {
  if (pathname === '/api/overview') return sendJson(res, 200, await overview())
  if (pathname === '/api/table') {
    const { page, size } = pageParams(params)
    const result = readTable(db, params.get('name') ?? '', page, size)
    return result ? sendJson(res, 200, result) : sendJson(res, 404, { error: 'unknown table' })
  }
  if (pathname === '/api/clips') {
    const { page, size } = pageParams(params)
    const clips = (await listBackup(DATA_DIR)).filter((f) => f.path.startsWith('clips/'))
    return sendJson(res, 200, paginate(clips, page, size))
  }
  const file = BACKUP_FILE.exec(pathname)
  if (file) return sendBackupFile(res, file[1])
  sendJson(res, 404, { error: 'not found' })
}

const handlePage = async (req: IncomingMessage, res: ServerResponse) => {
  const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'POST' && pathname === '/login') {
    // La clé arrive en JSON ({ key }) ; une session = un jeton aléatoire dans un cookie, en mémoire seulement.
    let key = ''
    try {
      key = String((JSON.parse(await readBody(req)) as { key?: unknown }).key ?? '')
    } catch {
      key = ''
    }
    if (!hasValidKey(key)) return sendJson(res, 401, { error: 'invalid key' })
    const token = randomBytes(24).toString('hex')
    sessions.add(token)
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` })
  }
  if (req.method === 'POST' && pathname === '/logout') {
    sessions.delete(sessionOf(req))
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0` })
  }
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' })
  if (pathname.startsWith('/api/') || pathname.startsWith('/files/')) {
    if (!sessions.has(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
    return service(res, pathname, searchParams)
  }
  sendStatic(res, pathname)
}

const secure = existsSync(TLS_CERT) && existsSync(TLS_KEY)
const page = secure ? createHttpsServer({ cert: readFileSync(TLS_CERT), key: readFileSync(TLS_KEY) }, handlePage) : createHttpServer(handlePage)
page.listen(PAGE_PORT, () => log(`Page de House Sync en ${secure ? 'HTTPS' : 'HTTP'} sur le port ${PAGE_PORT}`))

// ---- Le polling ----

log(`House Sync démarré (${DATA_DIR}/events.db, toutes les ${INTERVAL_MS / 1000} s)`)
await poll()
const timer = setInterval(poll, INTERVAL_MS)

const stop = () => {
  clearInterval(timer)
  page.close()
  db.close()
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
