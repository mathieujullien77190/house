// Le direct et l'image à l'instant, relayés depuis go2rtc (réseau Docker) : l'API ne parle
// qu'à go2rtc, qui n'a pas de mot de passe et n'est jamais publié.
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

export const createLiveService = (go2rtcUrls: string[], cameras: CamerasRepository) => {
  const streamOf = (camera: string): string | null => {
    const row = cameras.liveStreams().find((r) => r.camera === camera)
    return row ? streamNameOf(row.url) : null
  }

  /** Le go2rtc d'une caméra : celui dont l'adresse est dans son adresse de direct, à condition d'être dans la liste ; le premier sinon. */
  const baseOf = (camera: string): string => {
    const row = cameras.liveStreams().find((r) => r.camera === camera)
    try {
      const origin = row ? new URL(row.url).origin : ''
      return go2rtcUrls.find((url) => new URL(url).origin === origin) ?? go2rtcUrls[0]
    } catch {
      return go2rtcUrls[0]
    }
  }

  const open = async (camera: string, path: string, signal: AbortSignal): Promise<Upstream> => {
    const res = await fetch(`${baseOf(camera)}${path}`, { signal })
    return { status: res.status, contentType: res.headers.get('content-type') ?? 'application/octet-stream', body: res.body }
  }

  return {
    baseOf,
    /** Le flux MJPEG d'une caméra (multipart/x-mixed-replace), tant que le client reste connecté. */
    stream: (camera: string, signal: AbortSignal): Promise<Upstream | null> => {
      const src = streamOf(camera)
      // go2rtc ne sert du MJPEG que pour un flux déclaré en transcodage : <flux>_mjpeg (voir go2rtc/go2rtc.yaml).
      return src ? open(camera, `/api/stream.mjpeg?src=${encodeURIComponent(`${src}${MJPEG_SUFFIX}`)}`, signal) : Promise.resolve(null)
    },
    /** Une image JPEG de l'instant. */
    frame: (camera: string, signal: AbortSignal): Promise<Upstream | null> => {
      const src = streamOf(camera)
      return src ? open(camera, `/api/frame.jpeg?src=${encodeURIComponent(src)}`, signal) : Promise.resolve(null)
    },
  }
}

export type LiveService = ReturnType<typeof createLiveService>
