// House API, en lecture seule : elle lit la base SQLite et les clips écrits par House Sync, jamais Frigate.
// Services : auth (vérifie la clé), direct (adresse iframe), image (dernière image), events (le dernier ou tous)
// et clips (le fichier d'un événement). Chaque requête porte la clé secrète de l'utilisateur dans l'en-tête
// X-House-Key ; la clé n'est jamais dans le code de la WebApp. Plus tard : poe, avec une clé distincte.
import { timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { extname, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const PORT = Number(process.env.PORT ?? 8080)
const WEB_DIR = resolve(process.env.WEB_DIR ?? './web')
const DATA_DIR = resolve(process.env.DATA_DIR ?? './data')
const API_KEY = process.env.API_KEY ?? ''
// Certificat de la maison (créé par certs/make-certs.sh). Sans lui, l'API reste en HTTP : utile en développement,
// mais le direct et l'image de Frigate ne se chargent alors pas (cookie SameSite, voir le README).
const TLS_CERT = process.env.TLS_CERT ?? ''
const TLS_KEY = process.env.TLS_KEY ?? ''
const MAX_EVENTS = 200

if (API_KEY.length < 8) {
  console.error('API_KEY absente ou trop courte (8 caractères au moins) : l’API ne démarre pas.')
  process.exit(1)
}

// Les fichiers de la WebApp compilée (Vite) : la page, ses scripts et styles, et quelques images.
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

type EventRow = {
  id: string
  camera: string
  label: string
  started_at: number
  ended_at: number | null
  clip_path: string | null
}

// La base est créée par House Sync : on l'ouvre en lecture seule, au premier besoin.
let db: DatabaseSync | null = null
const database = () => {
  if (!db) db = new DatabaseSync(`${DATA_DIR}/events.db`, { readOnly: true })
  return db
}

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

// Comparaison en temps constant : la durée ne révèle pas combien de caractères sont bons.
const hasValidKey = (req: IncomingMessage) => {
  const key = req.headers['x-house-key']
  if (typeof key !== 'string') return false
  const given = Buffer.from(key)
  const expected = Buffer.from(API_KEY)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

const sendFile = async (res: ServerResponse, pathname: string) => {
  const file = resolve(WEB_DIR, `.${pathname === '/' ? '/index.html' : pathname}`)
  // Jamais de fichier hors du dossier de la WebApp.
  if (!file.startsWith(WEB_DIR + sep)) return sendJson(res, 404, { error: 'not found' })
  try {
    const content = await readFile(file)
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(content)
  } catch {
    sendJson(res, 404, { error: 'not found' })
  }
}

const sendClip = async (res: ServerResponse, id: string) => {
  const row = database().prepare('SELECT clip_path FROM events WHERE id = ?').get(id) as
    | { clip_path: string | null }
    | undefined
  if (!row?.clip_path) return sendJson(res, 404, { error: 'clip not found' })
  const file = resolve(DATA_DIR, row.clip_path)
  // Jamais de fichier hors du disque backup.
  if (!file.startsWith(DATA_DIR + sep)) return sendJson(res, 404, { error: 'clip not found' })
  try {
    const { size } = await stat(file)
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': size })
    createReadStream(file).pipe(res)
  } catch {
    sendJson(res, 404, { error: 'clip not found' })
  }
}

// Les services derrière la clé. Tout est lu dans SQLite ou sur le disque backup.
const service = async (req: IncomingMessage, res: ServerResponse, pathname: string, params: URLSearchParams) => {
  if (!hasValidKey(req)) return sendJson(res, 401, { error: 'invalid key' })
  if (pathname === '/auth') return sendJson(res, 200, { ok: true })
  try {
    if (pathname === '/direct') {
      return sendJson(res, 200, database().prepare('SELECT camera, url FROM live_streams ORDER BY camera').all())
    }
    if (pathname === '/image') {
      return sendJson(res, 200, database().prepare('SELECT camera, url FROM last_images ORDER BY camera').all())
    }
    if (pathname === '/events') {
      // ?last=1 : le dernier événement de chaque caméra ; sinon tous, du plus récent au plus ancien.
      const sql =
        params.get('last') === '1'
          ? 'SELECT * FROM events WHERE started_at = (SELECT MAX(started_at) FROM events e WHERE e.camera = events.camera) ORDER BY camera'
          : `SELECT * FROM events ORDER BY started_at DESC LIMIT ${MAX_EVENTS}`
      const rows = database().prepare(sql).all() as EventRow[]
      return sendJson(
        res,
        200,
        rows.map((row) => ({ ...row, clip: row.clip_path ? `/clips/${row.id}` : null, clip_path: undefined })),
      )
    }
    const clip = /^\/clips\/([\w.-]+)$/.exec(pathname)
    if (clip) return sendClip(res, clip[1])
  } catch (error) {
    // Base absente tant que House Sync n'a pas tourné une première fois.
    console.error(error instanceof Error ? error.message : String(error))
    return sendJson(res, 503, { error: 'database not ready' })
  }
  sendJson(res, 404, { error: 'not found' })
}

const SERVICES = ['/auth', '/direct', '/image', '/events']

const handle = async (req: IncomingMessage, res: ServerResponse) => {
  const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost')
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' })
  if (pathname === '/welcome') {
    return sendJson(res, 200, { service: 'house-api', message: 'Welcome to House API', time: new Date().toISOString() })
  }
  if (SERVICES.includes(pathname) || pathname.startsWith('/clips/')) return service(req, res, pathname, searchParams)
  sendFile(res, pathname)
}

const secure = existsSync(TLS_CERT) && existsSync(TLS_KEY)
const server = secure
  ? createHttpsServer({ cert: readFileSync(TLS_CERT), key: readFileSync(TLS_KEY) }, handle)
  : createHttpServer(handle)

server.listen(PORT, () => console.log(`House API en ${secure ? 'HTTPS' : 'HTTP'} sur le port ${PORT}`))

const stop = () => server.close(() => process.exit(0))
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
