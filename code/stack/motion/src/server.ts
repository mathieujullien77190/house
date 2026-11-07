// L'API de l'enregistreur, pour House Sync (config, événements, clip, dernière image), sans mot de passe ; elle n'écoute que sur le réseau Docker interne, jamais publiée.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { pipeline } from 'node:stream/promises'
import { audioClipPath } from './audio.ts'
import { webClipPath } from './clips.ts'
import type { Config } from './config.ts'
import type { EventStore } from './events.ts'
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
}

export const startServer = (config: Config, store: EventStore, detection: Detection, log: (message: string) => void) => {
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
    // PUT /api/cameras/<caméra>/sensitivity?level=1..5 : la sensibilité de la détection de mouvement de la caméra.
    const sensitivity = /^\/api\/cameras\/([\w-]+)\/sensitivity$/.exec(pathname)
    if (req.method === 'PUT' && sensitivity) {
      if (!config.cameras.includes(sensitivity[1])) return json(res, 404, { error: 'unknown camera' })
      const level = Number(searchParams.get('level'))
      if (!isSensitivity(level)) return json(res, 400, { error: `level must be an integer from ${MIN_SENSITIVITY} to ${MAX_SENSITIVITY}` })
      detection.setSensitivity(sensitivity[1], level)
      return json(res, 200, { camera: sensitivity[1], level })
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' })

    // Les caméras et, pour chacune, le go2rtc de cet enregistreur (son adresse sur le réseau Docker) et le flux à montrer en
    // direct : plusieurs enregistreurs, chacun avec son go2rtc, peuvent coexister (un par machine).
    if (pathname === '/api/config') {
      return json(res, 200, { cameras: Object.fromEntries(config.cameras.map((camera) => [camera, { live: { go2rtc: config.go2rtcApi, streams: { Léger: `${camera}_sub` } } }])) })
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
        }),
      )
    }

    // clip.mp4 : l'original (H.265, 4K) ; clip.h264.mp4 : la copie légère (H.264, 720p), absente tant qu'elle n'est pas faite.
    const clip = /^\/api\/events\/([\w.-]+?)\/clip(\.h264)?\.mp4$/.exec(pathname)
    if (clip) {
      const path = clip[2] ? webClipPath(clipPath(clip[1])) : clipPath(clip[1])
      if (!store.get(clip[1])?.has_clip || !existsSync(path)) return json(res, 404, { error: 'clip not found' })
      // X-Clip-Start : l'instant (secondes depuis 1970) où le clip commence, pour que House Sync le garde.
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': statSync(path).size, 'X-Clip-Start': String(store.get(clip[1])?.clip_start ?? '') })
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
        const upstream = await fetch(`${config.go2rtcApi}/api/frame.jpeg?src=${latest[1]}_main&height=${height}`, { signal: AbortSignal.timeout(FRAME_TIMEOUT_MS) })
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
