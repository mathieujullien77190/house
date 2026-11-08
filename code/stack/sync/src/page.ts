// La page de House Sync (port 8081) : les fichiers de la page React compilée (publics), la session par cookie, et les services de
// données derrière elle (réglages, vue d'ensemble, tables, clips, machine, Docker, réseau, Hue, fichiers du disque backup).
import { timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { createServer as createHttpsServer, type Server as HttpsServer } from 'node:https'
import { extname, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { messageOf, seconds, type Context } from './context.ts'
import type { Config } from './config.ts'
import { clipCameras, clipFilterParams, filterClips, filterParams, groupClips, listBackup, pageParams, paginate, readDiskSpace, readTable, summarizeTables, sumSize } from './data.ts'
import { ORIENTATIONS } from './database.ts'
import { readDocker } from './docker.ts'
import { readGuestEnabled, writeGuestEnabled } from './guestState.ts'
import { readHueBridge } from './hue.ts'
import type { HueLog } from './hueLog.ts'
import { intSetting, readJsonObject, sendJson } from './http.ts'
import { createAttemptLimiter } from './attempts.ts'
import { readNetwork } from './network.ts'
import { readCameraEnergy } from './cameraEnergy.ts'
import { readPower, type ApiTarget } from './power.ts'
import { parseRange } from './range.ts'
import { readSavedIds } from './savedClips.ts'
import { createToken, isValidToken, sessionCookie } from './session.ts'
import { CLIP_MODES, MAX_LIVE_FPS, MAX_RETENTION_DAYS, MAX_SENSITIVITY, MIN_RETENTION_DAYS, MIN_SENSITIVITY, SNAPSHOT_CHOICES } from './settings.ts'
import { readSpecs } from './specs.ts'
import { readSystem } from './system.ts'

/** Une clé plus courte n'ouvre aucune session : la page reste fermée tant que HOUSE_KEY n'est pas réglée. */
const MIN_KEY_LENGTH = 8
const SESSION_COOKIE = 'house_sync'

// Les fichiers de la page React compilée (dossier web), publics : les données, elles, sont derrière la session.
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

// Un clip ou une image du disque backup : seulement clips/<caméra>/<id>.mp4 ou snapshots/<caméra>/<t>.jpg.
const BACKUP_FILE = /^\/files\/((?:clips\/[\w-]+\/[\w.-]+\.mp4)|(?:snapshots\/[\w-]+\/\d+\.jpg))$/

/** La cible de l'API (pour la consommation PoE des caméras), ou null si elle n'est pas configurée. */
export const apiTargetOf = (config: Config): ApiTarget | null =>
  config.apiUrl && config.houseKey && existsSync(config.apiCaFile)
    ? { url: config.apiUrl, key: config.houseKey, ca: readFileSync(config.apiCaFile, 'utf8'), servername: config.apiServername }
    : null

export const createPage = (ctx: Context, deps: { hueLog: Pick<HueLog, 'list'>; resetLiveFpsCheck: () => void }) => {
  const { db, config, settings } = ctx
  const { hueLog, resetLiveFpsCheck } = deps
  const dataDir = config.dataDir
  const webDir = config.webDir

  // Les sessions : un cookie signé avec la clé et daté (session.ts), rien en mémoire.
  const hasSession = (token: string): boolean => config.houseKey.length >= MIN_KEY_LENGTH && isValidToken(config.houseKey, token, seconds(ctx))

  /** Les essais de clé ratés sur la page : 10 par adresse et par 15 minutes, puis 429. */
  const loginAttempts = createAttemptLimiter(10, 15 * 60_000, ctx.now)

  const hasValidKey = (given: string): boolean => {
    const a = Buffer.from(given)
    const b = Buffer.from(config.houseKey)
    return config.houseKey.length >= MIN_KEY_LENGTH && a.length === b.length && timingSafeEqual(a, b)
  }

  const sessionOf = (req: IncomingMessage): string => {
    const cookie = (req.headers.cookie ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    return cookie ? cookie.slice(SESSION_COOKIE.length + 1) : ''
  }

  const sendStatic = async (res: ServerResponse, pathname: string): Promise<void> => {
    const file = resolve(webDir, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(webDir + sep)) return sendJson(res, 404, { error: 'not found' })
    try {
      const content = await readFile(file)
      res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' })
      res.end(content)
    } catch {
      sendJson(res, 404, { error: 'not found' })
    }
  }

  // Un fichier du disque backup, par morceaux si le navigateur le demande (Range) : un téléphone lit la vidéo sans la
  // télécharger en entier et s'y déplace ; sans cela, il attend les 30 Mo (et l'iPhone refuse).
  const sendBackupFile = async (res: ServerResponse, relativePath: string, rangeHeader: string | undefined): Promise<void> => {
    try {
      const path = `${dataDir}/${relativePath}`
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
    const files = full ? await listBackup(dataDir) : []
    const clips = files.filter((f) => f.path.startsWith('clips/'))
    const snapshots = files.filter((f) => f.path.startsWith('snapshots/'))
    const dbSize = await stat(`${dataDir}/events.db`).then((s) => s.size).catch(() => 0)
    const disk = full ? await readDiskSpace(dataDir) : { total: 0, free: 0, reserved: 0 }
    return {
      database: { path: `${dataDir}/events.db`, size: dbSize, tables: summarizeTables(db) },
      backup: {
        path: dataDir,
        clips: { count: clips.length, size: sumSize(clips) },
        snapshots: { count: snapshots.length, size: sumSize(snapshots) },
        disk,
      },
    }
  }

  // Les services derrière la session : vue d'ensemble, une page d'une table, une page des clips, un fichier.
  const service = async (res: ServerResponse, pathname: string, params: URLSearchParams, rangeHeader: string | undefined) => {
    if (pathname === '/api/retention') return sendJson(res, 200, { clip_retention_days: settings.clipRetentionDays() })
    if (pathname === '/api/guest') return sendJson(res, 200, { guest_fps: settings.guestFps(), guest_enabled: await readGuestEnabled(config.guestStateFile) })
    if (pathname === '/api/settings') return sendJson(res, 200, settings.knownCameras().map((camera) => settings.cameraSettings(camera)))
    if (pathname === '/api/overview') return sendJson(res, 200, await overview(params.get('part') !== 'database'))
    if (pathname === '/api/docker') return sendJson(res, 200, await readDocker(config.dockerFile, config.composeFile))
    if (pathname === '/api/specs') return sendJson(res, 200, await readSpecs())
    if (pathname === '/api/hue') return sendJson(res, 200, await readHueBridge(config.hueAddress))
    if (pathname === '/api/hue-log') return sendJson(res, 200, hueLog.list(params))
    if (pathname === '/api/network') return sendJson(res, 200, await readNetwork())
    if (pathname === '/api/system') return sendJson(res, 200, await readSystem())
    if (pathname === '/api/camera-energy') return sendJson(res, 200, readCameraEnergy(db))
    if (pathname === '/api/power') return sendJson(res, 200, await readPower(config.powerFile, apiTargetOf(config)))
    if (pathname === '/api/table') {
      const { page, size } = pageParams(params)
      const result = readTable(db, params.get('name') ?? '', page, size, filterParams(params))
      return result ? sendJson(res, 200, result) : sendJson(res, 404, { error: 'unknown table' })
    }
    if (pathname === '/api/clips') {
      const { page, size } = pageParams(params)
      const all = groupClips((await listBackup(dataDir)).filter((f) => f.path.startsWith('clips/')))
      const wanted = clipFilterParams(params)
      // Sauvegardés ou non : la liste écrite par l'API ; illisible, elle compte pour vide (rien n'est montré comme sauvegardé).
      const saved = wanted.saved ? { ids: (await readSavedIds(config.savedClipsFile)) ?? new Set<string>(), keep: wanted.saved === 'saved' } : undefined
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
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(SESSION_COOKIE, createToken(config.houseKey, seconds(ctx))) })
    }
    if (req.method === 'POST' && pathname === '/logout') {
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(SESSION_COOKIE, '') })
    }
    // PUT /api/settings : { camera, clips_mode?, orientation?, live_fps?, light_fps?, live_fps_mobile?, light_fps_mobile?, motion_sensitivity?, snapshot_seconds? }, derrière la session.
    if (req.method === 'PUT' && pathname === '/api/settings') {
      if (!hasSession(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
      const body = await readJsonObject(req)
      if (!body) return sendJson(res, 400, { error: 'invalid JSON' })
      const camera = typeof body.camera === 'string' ? body.camera : ''
      if (!settings.knownCameras().includes(camera)) return sendJson(res, 404, { error: 'unknown camera' })
      const current = settings.cameraSettings(camera)
      const mode = body.clips_mode === undefined ? current.clips_mode : body.clips_mode
      if (typeof mode !== 'string' || !CLIP_MODES.includes(mode)) return sendJson(res, 400, { error: `clips_mode must be one of ${CLIP_MODES.join(', ')}` })
      const secs = body.snapshot_seconds === undefined ? current.snapshot_seconds : body.snapshot_seconds
      if (typeof secs !== 'number' || !SNAPSHOT_CHOICES.includes(secs)) return sendJson(res, 400, { error: `snapshot_seconds must be one of ${SNAPSHOT_CHOICES.join(', ')}` })
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
      const orientation = body.orientation === undefined ? current.orientation : body.orientation
      if (typeof orientation !== 'string' || !ORIENTATIONS.includes(orientation)) return sendJson(res, 400, { error: `orientation must be one of ${ORIENTATIONS.join(', ')}` })
      settings.saveCameraSettings({ camera, mode, fps, light, fpsMobile, lightMobile, sensitivity, seconds: secs, orientation })
      ctx.log(`Réglages de ${camera} : clips ${mode}, direct 4K à ${fps} images/s (téléphone ${fpsMobile}), léger à ${light} (téléphone ${lightMobile}), sensibilité du mouvement ${sensitivity}, une image toutes les ${secs} s`)
      resetLiveFpsCheck()
      return sendJson(res, 200, settings.cameraSettings(camera))
    }
    // PUT /api/retention : { clip_retention_days } (de 1 à 3650), la durée de garde des clips non sauvegardés, pour toutes les caméras.
    if (req.method === 'PUT' && pathname === '/api/retention') {
      if (!hasSession(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
      const body = await readJsonObject(req)
      if (!body) return sendJson(res, 400, { error: 'invalid JSON' })
      const days = intSetting(body.clip_retention_days, settings.clipRetentionDays(), MIN_RETENTION_DAYS, MAX_RETENTION_DAYS)
      if (days === null) return sendJson(res, 400, { error: `clip_retention_days must be an integer from ${MIN_RETENTION_DAYS} to ${MAX_RETENTION_DAYS}` })
      settings.saveRetention(days)
      ctx.log(`Durée de garde des clips : ${days} jours`)
      return sendJson(res, 200, { clip_retention_days: days })
    }
    // PUT /api/guest : { guest_fps?, guest_enabled? } : les images par seconde de la page invité (de 1 à 25 ; vignettes et 4K, PC et téléphone, toutes les caméras) et son interrupteur (false : elle ferme son port).
    if (req.method === 'PUT' && pathname === '/api/guest') {
      if (!hasSession(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
      const body = await readJsonObject(req)
      if (!body) return sendJson(res, 400, { error: 'invalid JSON' })
      const fps = intSetting(body.guest_fps, settings.guestFps(), 1, MAX_LIVE_FPS)
      if (fps === null) return sendJson(res, 400, { error: `guest_fps must be an integer from 1 to ${MAX_LIVE_FPS}` })
      if (body.guest_enabled !== undefined && typeof body.guest_enabled !== 'boolean') return sendJson(res, 400, { error: 'guest_enabled must be a boolean' })
      if (typeof body.guest_enabled === 'boolean') {
        try {
          await writeGuestEnabled(config.guestStateFile, body.guest_enabled)
        } catch {
          return sendJson(res, 500, { error: 'guest state not written' })
        }
        ctx.log(`Page invité : ${body.guest_enabled ? 'en ligne' : 'coupée'}`)
      }
      settings.saveGuestFps(fps)
      resetLiveFpsCheck()
      if (body.guest_fps !== undefined) ctx.log(`Page invité : ${fps} images/s`)
      return sendJson(res, 200, { guest_fps: fps, guest_enabled: await readGuestEnabled(config.guestStateFile) })
    }
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' })
    if (pathname.startsWith('/api/') || pathname.startsWith('/files/')) {
      if (!hasSession(sessionOf(req))) return sendJson(res, 401, { error: 'login required' })
      return service(res, pathname, searchParams, req.headers.range)
    }
    return sendStatic(res, pathname)
  }

  // Une erreur dans une requête (fichier système illisible, base occupée…) répond 500 et reste dans le journal : elle ne doit pas arrêter House Sync.
  const handlePage = (req: IncomingMessage, res: ServerResponse): Promise<void> =>
    route(req, res).catch((error: unknown) => {
      ctx.log(`Page : ${messageOf(error)}`)
      if (res.headersSent) res.destroy()
      else sendJson(res, 500, { error: 'internal error' })
    })

  return { handlePage, route }
}

/** Le serveur de la page : en HTTPS si le certificat et sa clé existent, en HTTP sinon. */
export const createPageServer = (config: Config, handler: (req: IncomingMessage, res: ServerResponse) => void): { server: Server | HttpsServer; secure: boolean } => {
  const secure = existsSync(config.tlsCert) && existsSync(config.tlsKey)
  const server = secure ? createHttpsServer({ cert: readFileSync(config.tlsCert), key: readFileSync(config.tlsKey) }, handler) : createHttpServer(handler)
  return { server, secure }
}
