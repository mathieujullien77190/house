// L'API de l'enregistreur, pour House Sync (config, événements, clip, dernière image), sans mot de passe ; elle n'écoute que sur le réseau Docker interne, jamais publiée.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { pipeline } from 'node:stream/promises'
import { audioClipPath } from './audio.ts'
import { shapesClipPath } from './shapes.ts'
import { webClipPath } from './clips.ts'
import type { Config } from './config.ts'
import type { EventStore } from './events.ts'
import { parsePolygon, type Point } from './zone.ts'
import { isMotionSeconds, MAX_MOTION_SECONDS, MIN_MOTION_SECONDS } from './detector.ts'
import { isSensitivity, MAX_SENSITIVITY, MIN_SENSITIVITY } from './sensitivity.ts'

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** go2rtc doit rendre une image en quelques secondes ; au-delà, on répond 502 plutôt que d'empiler les requêtes. */
const FRAME_TIMEOUT_MS = 10_000

const flag = (value: string | null): boolean | undefined => (value === null ? undefined : value === '1' || value === 'true')
const num = (value: string | null): number | undefined => (value !== null && Number.isFinite(Number(value)) ? Number(value) : undefined)

/** La détection de mouvement de chaque caméra, que House Sync allume ou éteint (allumée tant qu'on ne lui dit rien). */
export interface Detection {
  set: (camera: string, enabled: boolean) => void
  /** La sensibilité de la détection de la caméra, de 1 à 5 (3 : les seuils de base). */
  setSensitivity: (camera: string, level: number) => void
  /** La durée minimale d'un mouvement de la caméra, en secondes : un mouvement plus court n'ouvre aucun événement. */
  setMinSeconds: (camera: string, seconds: number) => void
  /** La zone surveillée de la caméra : un polygone (parts de l'image), ou null pour toute l'image. */
  setZone: (camera: string, points: Point[] | null) => void
  /** La recherche des yeux qui brillent (la nuit) de la caméra : allumée ou éteinte par House Sync. */
  setEyes: (camera: string, enabled: boolean) => void
  /** Le feuillage : nombre de zones à partir duquel un mouvement est étiqueté « feuillage » ; 0 = jamais. */
  setFoliage: (camera: string, zones: number) => void
  setRain: (camera: string, zones: number, height: number) => void
  /** Le clip lié de la caméra (LINKS) : allumé ou éteint par House Sync (éteint tant qu'on ne lui dit rien). */
  setLink: (camera: string, enabled: boolean) => void
  /** La pause des analyses de la caméra (House API, tant que son zoom optique n'est pas au grand angle) : à part de `set`, que House Sync répète chaque minute. */
  setPause: (camera: string, paused: boolean) => void
  /** Vrai tant que les analyses de la caméra sont en pause. */
  paused: (camera: string) => boolean
}

/** L'enregistrement lancé à la main, caméra par caméra : un mouvement fictif qu'on ouvre puis qu'on ferme, dont le clip se fait comme les autres. */
export interface Recording {
  status: (camera: string) => { recording: boolean; id: string | null; started_at: number | null }
  /** Commence (sans effet si la caméra enregistre déjà : rend l'enregistrement en cours). */
  start: (camera: string) => { id: string; started_at: number }
  /** Arrête ; null si la caméra n'enregistrait pas. */
  stop: (camera: string) => { id: string; started_at: number; ended_at: number } | null
}

/** La taille maximale du corps d'une demande de zone (1000 sommets tiennent dans environ 30 Ko). */
const MAX_BODY = 64 * 1024

const readBytes = (req: IncomingMessage, max: number): Promise<Buffer | null> =>
  new Promise((resolve) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > max) {
        resolve(null)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', () => resolve(null))
  })

const readBody = async (req: IncomingMessage): Promise<string | null> => (await readBytes(req, MAX_BODY))?.toString('utf8') ?? null

export const startServer = (
  config: Config,
  store: EventStore,
  detection: Detection,
  recording: Recording,
  log: (message: string) => void,
) => {
  const clipPath = (id: string): string => `${config.clipsDir}/${id}.mp4`

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    // Une adresse mal formée (« // ») fait échouer new URL : 400, et non une erreur qui ferait tomber l'enregistreur.
    let url: URL
    try {
      url = new URL(req.url ?? '/', 'http://localhost')
    } catch {
      return json(res, 400, { error: 'bad url' })
    }
    const { pathname, searchParams } = url
    // PUT /api/cameras/<caméra>/detection?enabled=0|1 : allume ou éteint la détection de mouvement de la caméra.
    const toggle = /^\/api\/cameras\/([\w-]+)\/detection$/.exec(pathname)
    if (req.method === 'PUT' && toggle) {
      if (!config.cameras.includes(toggle[1])) return json(res, 404, { error: 'unknown camera' })
      detection.set(toggle[1], searchParams.get('enabled') !== '0')
      return json(res, 200, { camera: toggle[1], enabled: searchParams.get('enabled') !== '0' })
    }
    // GET et PUT /api/cameras/<caméra>/pause?enabled=0|1 : la pause de toutes les analyses de la caméra (mouvement, yeux, clips liés), demandée par House API tant que le zoom optique
    // n'est pas au grand angle. À part de la détection : House Sync ne la connaît pas et ne peut pas l'annuler. En mémoire seulement.
    const pause = /^\/api\/cameras\/([\w-]+)\/pause$/.exec(pathname)
    if (pause && (req.method === 'PUT' || req.method === 'GET')) {
      if (!config.cameras.includes(pause[1])) return json(res, 404, { error: 'unknown camera' })
      if (req.method === 'PUT') {
        const enabled = searchParams.get('enabled')
        if (enabled !== '0' && enabled !== '1') return json(res, 400, { error: 'enabled must be 0 or 1' })
        detection.setPause(pause[1], enabled === '1')
      }
      return json(res, 200, { camera: pause[1], paused: detection.paused(pause[1]) })
    }
    // PUT /api/cameras/<caméra>/sensitivity?level=1..5 : la sensibilité de la détection de mouvement de la caméra.
    const sensitivity = /^\/api\/cameras\/([\w-]+)\/sensitivity$/.exec(pathname)
    if (req.method === 'PUT' && sensitivity) {
      if (!config.cameras.includes(sensitivity[1])) return json(res, 404, { error: 'unknown camera' })
      const level = Number(searchParams.get('level'))
      if (!isSensitivity(level)) return json(res, 400, { error: `level must be an integer from ${MIN_SENSITIVITY} to ${MAX_SENSITIVITY}` })
      detection.setSensitivity(sensitivity[1], level)
      return json(res, 200, { camera: sensitivity[1], level })
    }
    // PUT /api/cameras/<caméra>/link?enabled=0|1 : un mouvement ou des yeux vus par la caméra font (ou non) aussi un clip sur sa caméra liée (LINKS).
    const link = /^\/api\/cameras\/([\w-]+)\/link$/.exec(pathname)
    if (req.method === 'PUT' && link) {
      if (!config.cameras.includes(link[1])) return json(res, 404, { error: 'unknown camera' })
      detection.setLink(link[1], searchParams.get('enabled') === '1')
      return json(res, 200, { camera: link[1], enabled: searchParams.get('enabled') === '1' })
    }
    // PUT /api/cameras/<caméra>/eyes?enabled=0|1 : allume ou éteint la recherche des yeux qui brillent (House Sync l'allume la nuit seulement).
    const eyes = /^\/api\/cameras\/([\w-]+)\/eyes$/.exec(pathname)
    if (req.method === 'PUT' && eyes) {
      if (!config.cameras.includes(eyes[1])) return json(res, 404, { error: 'unknown camera' })
      detection.setEyes(eyes[1], searchParams.get('enabled') === '1')
      return json(res, 200, { camera: eyes[1], enabled: searchParams.get('enabled') === '1' })
    }
    // PUT /api/cameras/<caméra>/foliage?zones=0..60 : à partir de ce nombre de zones (sur assez d'images du mouvement), l'événement est étiqueté « feuillage » ; 0 : jamais.
    const foliage = /^\/api\/cameras\/([\w-]+)\/foliage$/.exec(pathname)
    if (req.method === 'PUT' && foliage) {
      if (!config.cameras.includes(foliage[1])) return json(res, 404, { error: 'unknown camera' })
      const zones = Number(searchParams.get('zones'))
      if (!Number.isInteger(zones) || zones < 0 || zones > 60) return json(res, 400, { error: 'zones must be an integer from 0 to 60' })
      detection.setFoliage(foliage[1], zones)
      return json(res, 200, { camera: foliage[1], zones })
    }
    // PUT /api/cameras/<caméra>/rain?zones=0..60&height=1..100 : à partir de ce nombre de contours d'au moins `height` % de la hauteur de l'image (sur assez d'images du mouvement), l'événement est étiqueté « pluie » ; zones 0 : jamais.
    const rain = /^\/api\/cameras\/([\w-]+)\/rain$/.exec(pathname)
    if (req.method === 'PUT' && rain) {
      if (!config.cameras.includes(rain[1])) return json(res, 404, { error: 'unknown camera' })
      const zones = Number(searchParams.get('zones'))
      const height = Number(searchParams.get('height'))
      if (!Number.isInteger(zones) || zones < 0 || zones > 60) return json(res, 400, { error: 'zones must be an integer from 0 to 60' })
      if (!Number.isInteger(height) || height < 1 || height > 100) return json(res, 400, { error: 'height must be an integer from 1 to 100' })
      detection.setRain(rain[1], zones, height)
      return json(res, 200, { camera: rain[1], zones, height })
    }
    // PUT /api/cameras/<caméra>/min-seconds?seconds=0..30 : la durée minimale d'un mouvement (en secondes) pour ouvrir un événement.
    const minSeconds = /^\/api\/cameras\/([\w-]+)\/min-seconds$/.exec(pathname)
    if (req.method === 'PUT' && minSeconds) {
      if (!config.cameras.includes(minSeconds[1])) return json(res, 404, { error: 'unknown camera' })
      const seconds = Number(searchParams.get('seconds'))
      if (!isMotionSeconds(seconds)) return json(res, 400, { error: `seconds must be an integer from ${MIN_MOTION_SECONDS} to ${MAX_MOTION_SECONDS}` })
      detection.setMinSeconds(minSeconds[1], seconds)
      return json(res, 200, { camera: minSeconds[1], seconds })
    }
    // PUT /api/cameras/<caméra>/zone avec {"points": [[x, y], ...]} (parts de l'image, de 3 à 1000 sommets) : la zone où on cherche le mouvement ; {"points": null} : toute l'image.
    const zone = /^\/api\/cameras\/([\w-]+)\/zone$/.exec(pathname)
    if (req.method === 'PUT' && zone) {
      if (!config.cameras.includes(zone[1])) return json(res, 404, { error: 'unknown camera' })
      const body = await readBody(req)
      let parsed: unknown
      try {
        parsed = body === null ? undefined : JSON.parse(body)
      } catch {
        parsed = undefined
      }
      const value = typeof parsed === 'object' && parsed !== null ? (parsed as { points?: unknown }).points : undefined
      const points = value === null ? null : parsePolygon(value)
      if (value === undefined || (value !== null && points === null))
        return json(res, 400, { error: 'points must be null or 3 to 1000 [x, y] pairs between 0 and 1' })
      detection.setZone(zone[1], points)
      return json(res, 200, { camera: zone[1], points })
    }
    // GET, POST et DELETE /api/cameras/<caméra>/record : l'état de l'enregistrement lancé à la main, son début, son arrêt (le clip se fait ensuite comme celui d'un mouvement).
    const record = /^\/api\/cameras\/([\w-]+)\/record$/.exec(pathname)
    if (record) {
      if (!config.cameras.includes(record[1])) return json(res, 404, { error: 'unknown camera' })
      if (req.method === 'GET') return json(res, 200, recording.status(record[1]))
      if (req.method === 'POST') return json(res, 200, { recording: true, ...recording.start(record[1]) })
      if (req.method === 'DELETE') {
        const stopped = recording.stop(record[1])
        return stopped ? json(res, 200, { recording: false, ...stopped }) : json(res, 409, { error: 'not recording' })
      }
      return json(res, 405, { error: 'method not allowed' })
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' })

    // Les caméras et, pour chacune, le go2rtc de cet enregistreur (son adresse sur le réseau Docker) et le flux à montrer en
    // direct : plusieurs enregistreurs, chacun avec son go2rtc, peuvent coexister (un par machine).
    if (pathname === '/api/config') {
      return json(res, 200, {
        cameras: Object.fromEntries(
          config.cameras.map((camera) => [camera, { live: { go2rtc: config.go2rtcApi, streams: { Léger: `${camera}_sub` } }, paused: detection.paused(camera) }]),
        ),
      })
    }

    if (pathname === '/api/events') {
      return json(
        res,
        200,
        store.list({
          after: num(searchParams.get('after')),
          before: num(searchParams.get('before')),
          hasClip: flag(searchParams.get('has_clip')),
          inProgress: flag(searchParams.get('in_progress')),
          limit: num(searchParams.get('limit')),
          mergedAfter: num(searchParams.get('merged_after')),
          labelledAfter: num(searchParams.get('labelled_after')),
        }),
      )
    }

    // clip.mp4 : l'original (H.265, 4K) ; clip.h264.mp4 : la copie légère (H.264, 720p), absente tant qu'elle n'est pas faite.
    const clip = /^\/api\/events\/([\w.-]+?)\/clip(\.h264)?\.mp4$/.exec(pathname)
    if (clip) {
      const path = clip[2] ? webClipPath(clipPath(clip[1])) : clipPath(clip[1])
      if (!store.get(clip[1])?.has_clip || !existsSync(path)) return json(res, 404, { error: 'clip not found' })
      // X-Clip-Start : l'instant (secondes depuis 1970) où le clip commence, pour que House Sync le garde.
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': statSync(path).size,
        'X-Clip-Start': String(store.get(clip[1])?.clip_start ?? ''),
      })
      // pipeline ferme le fichier si le client part ou si la lecture échoue (sans quoi le descripteur resterait ouvert).
      return await pipeline(createReadStream(path), res)
    }

    // clip.aac : le son du clip (AAC), à part de la vidéo ; absent pour une caméra sans son et pour un clip d'avant.
    const sound = /^\/api\/events\/([\w.-]+?)\/clip\.aac$/.exec(pathname)
    if (sound) {
      const path = audioClipPath(clipPath(sound[1]))
      if (!store.get(sound[1])?.has_audio || !existsSync(path)) return json(res, 404, { error: 'sound not found' })
      res.writeHead(200, { 'Content-Type': 'audio/aac', 'Content-Length': statSync(path).size })
      return await pipeline(createReadStream(path), res)
    }

    // shapes.json : les contours du mouvement du clip ({ frames: [[secondes depuis le début du clip, polygones], ...] }) ; absent pour un clip fait avant leur ajout.
    const shapesFile = /^\/api\/events\/([\w.-]+?)\/shapes\.json$/.exec(pathname)
    if (shapesFile) {
      const path = shapesClipPath(clipPath(shapesFile[1]))
      if (!store.get(shapesFile[1])?.has_shapes || !existsSync(path)) return json(res, 404, { error: 'shapes not found' })
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': statSync(path).size })
      return await pipeline(createReadStream(path), res)
    }

    const event = /^\/api\/events\/([\w.-]+)$/.exec(pathname)
    if (event) {
      const record = store.get(event[1])
      return record ? json(res, 200, record) : json(res, 404, { success: false, message: 'Event not found' })
    }

    // La dernière image : une image du flux principal, prise par go2rtc, à la demande.
    const latest = /^\/api\/([\w-]+)\/latest\.jpg$/.exec(pathname)
    if (latest && config.cameras.includes(latest[1])) {
      const height = num(searchParams.get('h')) ?? 720
      try {
        const upstream = await fetch(`${config.go2rtcApi}/api/frame.jpeg?src=${latest[1]}_main&height=${height}`, {
          signal: AbortSignal.timeout(FRAME_TIMEOUT_MS),
        })
        if (!upstream.ok) return json(res, 502, { error: `go2rtc answered ${upstream.status}` })
        res.writeHead(200, { 'Content-Type': 'image/jpeg' })
        return res.end(Buffer.from(await upstream.arrayBuffer()))
      } catch {
        return json(res, 502, { error: 'go2rtc unreachable' })
      }
    }

    json(res, 404, { error: 'not found' })
  }

  // Une erreur dans une requête (fichier disparu, lecture coupée) répond 500 ou ferme la connexion : elle ne fait pas tomber l'enregistreur.
  const server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      log(`API : ${error instanceof Error ? error.message : String(error)}`)
      if (res.headersSent) res.destroy()
      else json(res, 500, { error: 'internal error' })
    })
  })

  server.listen(config.port, () => log(`API de l'enregistreur sur le port ${config.port}`))
  return server
}
