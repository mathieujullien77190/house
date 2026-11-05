// L'API de l'enregistreur, pour House Sync : la forme de celle que Frigate offrait (config, événements, clip,
// dernière image), sans mot de passe ; elle n'écoute que sur le réseau Docker interne, jamais publiée.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type ServerResponse } from 'node:http'
import { webClipPath } from './clips.ts'
import type { Config } from './config.ts'
import type { EventStore } from './events.ts'

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

const flag = (value: string | null): boolean | undefined => (value === null ? undefined : value === '1' || value === 'true')
const num = (value: string | null): number | undefined => (value !== null && Number.isFinite(Number(value)) ? Number(value) : undefined)

/** La détection de mouvement de chaque caméra, que House Sync allume ou éteint (allumée tant qu'on ne lui dit rien). */
export interface Detection {
  set: (camera: string, enabled: boolean) => void
}

export const startServer = (config: Config, store: EventStore, detection: Detection, log: (message: string) => void) => {
  const clipPath = (id: string): string => `${config.clipsDir}/${id}.mp4`

  const server = createServer(async (req, res) => {
    const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost')
    // PUT /api/cameras/<caméra>/detection?enabled=0|1 : allume ou éteint la détection de mouvement de la caméra.
    const toggle = /^\/api\/cameras\/([\w-]+)\/detection$/.exec(pathname)
    if (req.method === 'PUT' && toggle) {
      if (!config.cameras.includes(toggle[1])) return json(res, 404, { error: 'unknown camera' })
      detection.set(toggle[1], searchParams.get('enabled') !== '0')
      return json(res, 200, { camera: toggle[1], enabled: searchParams.get('enabled') !== '0' })
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
      return createReadStream(path).pipe(res)
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
        const upstream = await fetch(`${config.go2rtcApi}/api/frame.jpeg?src=${latest[1]}_main&height=${height}`)
        if (!upstream.ok) return json(res, 502, { error: `go2rtc answered ${upstream.status}` })
        res.writeHead(200, { 'Content-Type': 'image/jpeg' })
        return res.end(Buffer.from(await upstream.arrayBuffer()))
      } catch {
        return json(res, 502, { error: 'go2rtc unreachable' })
      }
    }

    json(res, 404, { error: 'not found' })
  })

  server.listen(config.port, () => log(`API de l'enregistreur sur le port ${config.port}`))
  return server
}
