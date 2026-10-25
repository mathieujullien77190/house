// House Sync : se connecte à Frigate avec le compte viewer puis, à intervalle régulier, lit les caméras
// et les événements terminés, copie chaque clip sur le disque backup et écrit dans SQLite les événements,
// l'adresse de la dernière image et l'adresse iframe du direct de chaque caméra.
// Seul House Sync écrit dans cette base ; House API la lit. Il sert aussi sa propre page (port 8081, HTTPS,
// derrière la clé) qui montre la base et les fichiers du disque backup : l'API n'expose jamais la base brute.
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { readdir, stat, writeFile } from 'node:fs/promises'
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { DatabaseSync } from 'node:sqlite'
import { dumpTables, renderLogin, renderPage, type BackupFile } from './page.ts'

const FRIGATE_URL = process.env.FRIGATE_URL ?? 'https://frigate:8971'
// La page de House Sync : sa clé (la même que l'API), son port et le certificat de la maison.
const HOUSE_KEY = process.env.HOUSE_KEY ?? ''
const PAGE_PORT = Number(process.env.PAGE_PORT ?? 8081)
const PAGE_REFRESH_SECONDS = 15
const TLS_CERT = process.env.TLS_CERT ?? ''
const TLS_KEY = process.env.TLS_KEY ?? ''
const SESSION_COOKIE = 'house_sync'
// Adresse de Frigate telle que le navigateur de l'utilisateur la voit : c'est lui qui charge le direct et l'image.
const FRIGATE_PUBLIC_URL = (process.env.FRIGATE_PUBLIC_URL ?? 'https://localhost:8971').replace(/\/$/, '')
const FRIGATE_USER = process.env.FRIGATE_USER ?? ''
const FRIGATE_PASSWORD = process.env.FRIGATE_PASSWORD ?? ''
const DATA_DIR = process.env.DATA_DIR ?? './data'
const INTERVAL_MS = Number(process.env.POLL_INTERVAL_SECONDS ?? 30) * 1000
const EVENTS_PER_POLL = 50
// Un événement long peut se terminer après des événements plus récents : on relit une heure en arrière.
const LOOK_BACK_SECONDS = 3600

type FrigateConfig = { cameras: Record<string, { live?: { streams?: Record<string, string> } }> }
type FrigateEvent = {
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
    clip_path TEXT
  );
  CREATE TABLE IF NOT EXISTS last_images (
    camera TEXT PRIMARY KEY,
    url TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS live_streams (
    camera TEXT PRIMARY KEY,
    url TEXT NOT NULL
  );
`)
const upsertImage = db.prepare(
  'INSERT INTO last_images (camera, url) VALUES (?, ?) ON CONFLICT(camera) DO UPDATE SET url = excluded.url',
)
const upsertLive = db.prepare(
  'INSERT INTO live_streams (camera, url) VALUES (?, ?) ON CONFLICT(camera) DO UPDATE SET url = excluded.url',
)
const hasEvent = db.prepare('SELECT 1 FROM events WHERE id = ?')
const insertEvent = db.prepare(
  'INSERT INTO events (id, camera, label, started_at, ended_at, clip_path) VALUES (?, ?, ?, ?, ?, ?)',
)
const lastStart = db.prepare('SELECT MAX(started_at) AS t FROM events')

const log = (message: string) => console.log(`${new Date().toISOString()} ${message}`)

// Cookie de session de Frigate (frigate_token), renvoyé par POST /api/login. Vide tant qu'on n'est pas connecté.
let cookie = ''

const login = async () => {
  const res = await fetch(`${FRIGATE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: FRIGATE_USER, password: FRIGATE_PASSWORD }),
  })
  if (!res.ok) throw new Error(`connexion refusée (HTTP ${res.status})`)
  // On ne garde que la paire nom=valeur du cookie, sans ses attributs (Path, HttpOnly…).
  const token = res.headers.getSetCookie().find((c) => c.startsWith('frigate_token='))
  if (!token) throw new Error('pas de cookie frigate_token dans la réponse')
  cookie = token.split(';')[0]
  log(`Connecté à Frigate (${FRIGATE_USER})`)
}

// Requête authentifiée : se connecte si besoin, et une seule fois de plus si la session a expiré (401).
const frigate = async (path: string): Promise<Response> => {
  if (!cookie) await login()
  const res = await fetch(`${FRIGATE_URL}${path}`, { headers: { Cookie: cookie } })
  if (res.status !== 401) return res
  cookie = ''
  await login()
  return fetch(`${FRIGATE_URL}${path}`, { headers: { Cookie: cookie } })
}

// Pour chaque caméra de Frigate : l'adresse de sa dernière image et celle de la page du direct (go2rtc),
// avec le premier flux « live » déclaré dans la configuration, ou le nom de la caméra à défaut.
const syncCameras = async () => {
  const res = await frigate('/api/config')
  if (!res.ok) throw new Error(`config : HTTP ${res.status}`)
  const config = (await res.json()) as FrigateConfig
  for (const [camera, cam] of Object.entries(config.cameras)) {
    const stream = Object.values(cam.live?.streams ?? {})[0] ?? camera
    upsertImage.run(camera, `${FRIGATE_PUBLIC_URL}/api/${camera}/latest.jpg`)
    upsertLive.run(camera, `${FRIGATE_PUBLIC_URL}/live/webrtc/stream.html?src=${stream}`)
  }
  return Object.keys(config.cameras).length
}

// Copie le clip d'un événement dans DATA_DIR/clips/<caméra>/<id>.mp4 et renvoie ce chemin relatif.
const copyClip = async (event: FrigateEvent) => {
  // L'identifiant sert de nom de fichier : rien d'autre que des caractères sûrs.
  if (!/^[\w.-]+$/.test(event.id) || !/^[\w-]+$/.test(event.camera)) return null
  const res = await frigate(`/api/events/${event.id}/clip.mp4`)
  if (!res.ok) {
    log(`Clip ${event.id} indisponible (HTTP ${res.status})`)
    return null
  }
  mkdirSync(`${DATA_DIR}/clips/${event.camera}`, { recursive: true })
  const path = `clips/${event.camera}/${event.id}.mp4`
  await writeFile(`${DATA_DIR}/${path}`, Buffer.from(await res.arrayBuffer()))
  return path
}

// Les événements terminés qui ont un clip, du plus ancien au plus récent, en ignorant ceux déjà copiés.
const syncEvents = async () => {
  const after = Math.max(0, Number((lastStart.get() as { t: number | null }).t ?? 0) - LOOK_BACK_SECONDS)
  const res = await frigate(`/api/events?after=${after}&has_clip=1&in_progress=0&limit=${EVENTS_PER_POLL}`)
  if (!res.ok) throw new Error(`events : HTTP ${res.status}`)
  const events = ((await res.json()) as FrigateEvent[]).reverse()
  let copied = 0
  for (const event of events) {
    if (hasEvent.get(event.id)) continue
    const clipPath = await copyClip(event)
    insertEvent.run(
      event.id,
      event.camera,
      event.label,
      Math.floor(event.start_time),
      event.end_time === null ? null : Math.floor(event.end_time),
      clipPath,
    )
    copied += 1
  }
  return copied
}

let busy = false
const poll = async () => {
  if (busy) return
  busy = true
  try {
    const cameras = await syncCameras()
    const copied = await syncEvents()
    log(`${cameras} caméra(s), ${copied} nouvel(aux) événement(s)`)
  } catch (error) {
    log(`Frigate : ${error instanceof Error ? error.message : String(error)}`)
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

const sendHtml = (res: ServerResponse, status: number, html: string, headers: Record<string, string> = {}) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers })
  res.end(html)
}

// Les fichiers du disque backup (les clips), du plus récent au plus ancien, chemins relatifs au disque.
const listBackup = async (dir: string, prefix = ''): Promise<BackupFile[]> => {
  const out: BackupFile[] = []
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) out.push(...(await listBackup(`${dir}/${entry.name}`, `${prefix}${entry.name}/`)))
    else if (entry.isFile() && !entry.name.startsWith('events.db')) {
      const info = await stat(`${dir}/${entry.name}`)
      out.push({ path: `${prefix}${entry.name}`, size: info.size, modifiedMs: info.mtimeMs })
    }
  }
  return out.sort((a, b) => b.modifiedMs - a.modifiedMs)
}

const handlePage = async (req: IncomingMessage, res: ServerResponse) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'POST' && pathname === '/login') {
    const key = new URLSearchParams(await readBody(req)).get('key') ?? ''
    if (!hasValidKey(key)) return sendHtml(res, 401, renderLogin(true))
    const token = randomBytes(24).toString('hex')
    sessions.add(token)
    res.writeHead(303, { Location: '/', 'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` })
    return res.end()
  }
  if (req.method !== 'GET') return sendHtml(res, 405, renderLogin(false))
  if (pathname === '/logout') {
    sessions.delete(sessionOf(req))
    res.writeHead(303, { Location: '/', 'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0` })
    return res.end()
  }
  if (!sessions.has(sessionOf(req))) return sendHtml(res, pathname === '/' ? 200 : 401, renderLogin(false))
  // Un clip du disque backup, pour le lecteur de la page : seulement un chemin de la forme clips/<caméra>/<id>.mp4.
  const file = /^\/files\/(clips\/[\w-]+\/[\w.-]+\.mp4)$/.exec(pathname)
  if (file) {
    try {
      const { size } = await stat(`${DATA_DIR}/${file[1]}`)
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': size })
      return createReadStream(`${DATA_DIR}/${file[1]}`).pipe(res)
    } catch {
      return sendHtml(res, 404, renderLogin(false))
    }
  }
  if (pathname !== '/') return sendHtml(res, 404, renderLogin(false))
  const dbSize = await stat(`${DATA_DIR}/events.db`).then((s) => s.size).catch(() => 0)
  sendHtml(res, 200, renderPage(`${DATA_DIR}/events.db`, dbSize, dumpTables(db), DATA_DIR, await listBackup(DATA_DIR), PAGE_REFRESH_SECONDS))
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
