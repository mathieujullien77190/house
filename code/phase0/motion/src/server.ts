// L'API de l'enregistreur, pour House Sync : la forme de celle que Frigate offrait (config, événements, clip,
// dernière image), sans mot de passe ; elle n'écoute que sur le réseau Docker interne, jamais publiée.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type ServerResponse } from 'node:http'
import type { Config } from './config.ts'
import type { EventStore } from './events.ts'

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

const flag = (value: string | null): boolean | undefined => (value === null ? undefined : value === '1' || value === 'true')
const num = (value: string | null): number | undefined => (value !== null && Number.isFinite(Number(value)) ? Number(value) : undefined)

export const startServer = (config: Config, store: EventStore, log: (message: string) => void) => {
  const clipPath = (id: string): string => `${config.clipsDir}/${id}.mp4`

  const server = createServer(async (req, res) => {
    const { pathname, searchParams } = new URL(req.url ?? '/', 'http://localhost')
    if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' })

    // Les caméras et, pour chacune, le flux go2rtc à montrer en direct (celui que l'API de la maison relaie).
    if (pathname === '/api/config') {
      return json(res, 200, { cameras: Object.fromEntries(config.cameras.map((camera) => [camera, { live: { streams: { Léger: `${camera}_sub` } } }])) })
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
        }),
      )
    }

    const clip = /^\/api\/events\/([\w.-]+)\/clip\.mp4$/.exec(pathname)
    if (clip) {
      const path = clipPath(clip[1])
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
