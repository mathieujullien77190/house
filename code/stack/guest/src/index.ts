// La page invité : le direct des caméras, pour quelqu'un à qui on donne le lien (`/?k=<GUEST_KEY>`, la clé reste dans l'adresse, rien n'est gardé). Elle ne sait rien faire d'autre :
// ni clips, ni réglages, ni commande. Un conteneur à part, sur son propre réseau avec go2rtc seulement, sans disque ni base :
// `docker compose stop guest` la coupe complètement, et le bouton « Coupée » de House Sync ferme son port (state.ts).
import { readFileSync } from 'node:fs'
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { Readable } from 'node:stream'
import { sameSecret } from './auth.ts'
import { createAttemptLimiter } from './attempts.ts'
import { clientIp } from './client.ts'
import { loadConfig } from './config.ts'
import { renderPage, SCRIPT_HASH } from './page.ts'
import { readEnabled, STATE_POLL_MS } from './state.ts'
import { createVisitLog, describeAgent, originOf, type VisitEntry } from './visits.ts'

const config = loadConfig()
const limiter = createAttemptLimiter()
// Le journal des visites (House Sync l'importe dans sa table guest_visits) : qui vient, quand, ce qu'il regarde. La clé n'y est jamais écrite.
const visits = createVisitLog(config.visitsFile)
const note = (req: IncomingMessage, kind: VisitEntry['kind'], status: number, path: string, extra: Partial<VisitEntry> = {}) => {
  const ip = clientIp(req.socket.remoteAddress ?? '', req.headers['x-forwarded-for'])
  const userAgent = String(req.headers['user-agent'] ?? '')
  visits.log({
    at: Math.round(Date.now() / 1000),
    kind,
    ip,
    origin: originOf(ip),
    device: describeAgent(userAgent),
    user_agent: userAgent.slice(0, 200),
    language: String(req.headers['accept-language'] ?? '').split(',')[0].slice(0, 20),
    host: String(req.headers.host ?? '').slice(0, 100),
    key: 'avec clé',
    path,
    camera: '',
    quality: '',
    status,
    duration: null,
    bytes: null,
    ...extra,
  })
}
// Une tentative refusée (pas de clé, mauvaise clé) n'est notée qu'une fois par minute et par adresse : un robot qui frappe en boucle ne remplit pas le journal.
const refusedAt = new Map<string, number>()
const noteRefused = (req: IncomingMessage, status: number, path: string, key: string) => {
  const ip = clientIp(req.socket.remoteAddress ?? '', req.headers['x-forwarded-for'])
  if (Date.now() - (refusedAt.get(ip) ?? 0) < 60_000) return
  if (refusedAt.size > 1000) refusedAt.clear()
  refusedAt.set(ip, Date.now())
  note(req, 'refused', status, path, { key })
}
/** Les flux ouverts en ce moment. */
const open = new Set<ServerResponse>()
/** Les flux de la page invité, à la cadence réglée dans House Sync (« Page invité », voir go2rtc/go2rtc.yaml) : le léger, et le 4K de la caméra agrandie. */
const LIGHT_SUFFIX = '_guest_sub_mjpeg'
const HD_SUFFIX = '_guest_main_mjpeg'
// La page se recharge une minute avant que les flux se coupent.
const REFRESH_SECONDS = Math.max(30, config.maxMinutes * 60 - 60)

const send = (res: ServerResponse, status: number, body = '', type = 'text/plain; charset=utf-8', headers: Record<string, string> = {}) => {
  res.writeHead(status, { 'Content-Type': type, ...headers })
  res.end(body)
}

const stream = async (req: IncomingMessage, res: ServerResponse, camera: string, hd: boolean, ip: string) => {
  // Chaque personne ouvre un flux léger par caméra et un 4K pour la caméra agrandie.
  const quality = hd ? '4K' : 'léger'
  if (open.size >= config.maxViewers * (config.cameras.length + 1)) {
    note(req, 'stream', 503, '/stream', { camera, quality })
    send(res, 503, 'Trop de monde regarde en ce moment.')
    return
  }
  const startedAt = Date.now()
  let bytes = 0
  open.add(res)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.maxMinutes * 60_000)
  console.log(`guest: ${camera}${hd ? ' 4K' : ''} ouvert par ${ip} (${open.size} flux) ${JSON.stringify(String(req.headers['user-agent'] ?? '').slice(0, 80))}`)
  res.on('close', () => {
    clearTimeout(timer)
    controller.abort()
    open.delete(res)
    console.log(`guest: ${camera}${hd ? ' 4K' : ''} fermé par ${ip} (${open.size} flux)`)
    note(req, 'stream', res.statusCode, '/stream', { at: Math.round(startedAt / 1000), camera, quality, duration: Math.round((Date.now() - startedAt) / 100) / 10, bytes })  })
  try {
    const upstream = await fetch(`${config.go2rtcUrl}/api/stream.mjpeg?src=${encodeURIComponent(`${camera}${hd ? HD_SUFFIX : LIGHT_SUFFIX}`)}`, { signal: controller.signal })
    if (upstream.status !== 200 || !upstream.body) {
      void upstream.body?.cancel().catch(() => undefined)
      if (!res.headersSent) send(res, 502, 'Direct indisponible.')
      return
    }
    res.writeHead(200, { 'Content-Type': upstream.headers.get('content-type') ?? 'multipart/x-mixed-replace', 'Cache-Control': 'no-store' })
    Readable.fromWeb(upstream.body)
      .on('data', (chunk: Uint8Array) => {
        bytes += chunk.length
      })
      .on('error', () => res.end())
      .pipe(res)
  } catch {
    if (!res.headersSent) send(res, 502, 'Direct indisponible.')
    else res.end()
  }
}

const handle = (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Content-Security-Policy', `default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src '${SCRIPT_HASH}'; frame-ancestors 'none'`)
  if (req.method !== 'GET') return send(res, 405, '', undefined, { Allow: 'GET' })
  const url = new URL(req.url ?? '/', 'http://guest')
  const ip = clientIp(req.socket.remoteAddress ?? '', req.headers['x-forwarded-for'])

  // La clé est dans l'adresse de chaque demande, la page comme chaque flux : sans elle, ou fausse, rien ne répond (404, comme si la page n'existait pas) ;
  // 10 clés fausses depuis une même adresse en 15 min, puis 429.
  const given = url.searchParams.get('k')
  if (given === null) {
    noteRefused(req, 404, url.pathname, 'sans clé')
    return send(res, 404, 'Not found')
  }
  if (limiter.isBlocked(ip)) {
    noteRefused(req, 429, url.pathname, sameSecret(given, config.key) ? 'avec clé' : 'clé fausse')
    return send(res, 429, 'Trop d’essais.')
  }
  if (!sameSecret(given, config.key)) {
    limiter.fail(ip)
    noteRefused(req, 404, url.pathname, 'clé fausse')
    return send(res, 404, 'Not found')
  }
  limiter.clear(ip)
  if (url.pathname === '/') {
    note(req, 'page', 200, '/')
    return send(res, 200, renderPage(config.cameras, config.key, REFRESH_SECONDS), 'text/html; charset=utf-8')
  }
  if (url.pathname === '/stream') {
    const camera = url.searchParams.get('camera') ?? ''
    if (!config.cameras.includes(camera)) return send(res, 404, 'Not found')
    return void stream(req, res, camera, url.searchParams.get('quality') === '4k', ip)
  }
  return send(res, 404, 'Not found')
}

// Le serveur n'existe que tant que la page est en ligne : coupée (House Sync), il est fermé (port fermé, flux en cours coupés) puis rouvert à la remise en ligne.
let server: Server | null = null
const openServer = () => {
  try {
    const created = config.tls
      ? createHttpsServer({ cert: readFileSync(config.tls.cert), key: readFileSync(config.tls.key) }, handle)
      : createHttpServer(handle)
    created.listen(config.port, () => console.log(`Page invité en ${config.tls ? 'HTTPS' : 'HTTP'} sur le port ${config.port} (${config.cameras.join(', ')})`))
    created.on('error', (error) => console.error(`Page invité : ${error.message}`))
    server = created
  } catch (error) {
    console.error(`Page invité : ouverture impossible : ${error instanceof Error ? error.message : String(error)}`)
  }
}
const closeServer = () => {
  const closing = server
  server = null
  closing?.close()
  closing?.closeAllConnections()
}
let checking = false
const applyState = async () => {
  if (checking) return
  checking = true
  try {
    const enabled = await readEnabled(config.stateFile)
    if (enabled && !server) openServer()
    else if (!enabled && server) {
      closeServer()
      console.log('Page invité coupée depuis House Sync : le port est fermé')
    }
  } finally {
    checking = false
  }
}
void applyState()
setInterval(() => void applyState(), STATE_POLL_MS)

const stop = () => {
  const closing = server
  if (!closing) process.exit(0)
  closing?.close(() => process.exit(0))
  closing?.closeAllConnections()
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
