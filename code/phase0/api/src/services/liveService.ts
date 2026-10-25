// Le direct et l'image à l'instant, relayés depuis go2rtc (dans Frigate, réseau Docker) : l'API ne parle
// jamais à l'API de Frigate, seulement à go2rtc, qui n'a pas de mot de passe et n'est jamais publié.
import type { CamerasRepository } from '../repositories/camerasRepository.ts'

const MJPEG_SUFFIX = '_mjpeg'

export interface Upstream {
  status: number
  contentType: string
  body: ReadableStream<Uint8Array> | null
}

/** Le nom du flux go2rtc d'une caméra, écrit par House Sync dans l'adresse du direct (?src=…). */
const streamNameOf = (url: string): string | null => {
  try {
    return new URL(url).searchParams.get('src')
  } catch {
    return null
  }
}

export const createLiveService = (go2rtcUrl: string, cameras: CamerasRepository) => {
  const streamOf = (camera: string): string | null => {
    const row = cameras.liveStreams().find((r) => r.camera === camera)
    return row ? streamNameOf(row.url) : null
  }

  const open = async (path: string, signal: AbortSignal): Promise<Upstream> => {
    const res = await fetch(`${go2rtcUrl}${path}`, { signal })
    return { status: res.status, contentType: res.headers.get('content-type') ?? 'application/octet-stream', body: res.body }
  }

  return {
    /** Le flux MJPEG d'une caméra (multipart/x-mixed-replace), tant que le client reste connecté. */
    stream: (camera: string, signal: AbortSignal): Promise<Upstream | null> => {
      const src = streamOf(camera)
      // go2rtc ne sert du MJPEG que pour un flux déclaré en transcodage : <flux>_mjpeg (voir frigate/config/config.yml).
      return src ? open(`/api/stream.mjpeg?src=${encodeURIComponent(`${src}${MJPEG_SUFFIX}`)}`, signal) : Promise.resolve(null)
    },
    /** Une image JPEG de l'instant. */
    frame: (camera: string, signal: AbortSignal): Promise<Upstream | null> => {
      const src = streamOf(camera)
      return src ? open(`/api/frame.jpeg?src=${encodeURIComponent(src)}`, signal) : Promise.resolve(null)
    },
  }
}

export type LiveService = ReturnType<typeof createLiveService>
