// La surveillance du mouvement d'une caméra : ffmpeg lit le flux léger (images grises 160×90, 5 par seconde) sur sa
// sortie, on compare chaque image à la précédente (detector.ts) et on rend chaque début et chaque fin de mouvement.
import { spawn } from 'node:child_process'
import type { Config } from './config.ts'
import { changedShare, createDetector, type MotionEvent } from './detector.ts'
import { isStopping, track } from './shutdown.ts'

const RETRY_SECONDS = 5
const CHECK_MS = 1000
const SUSPENDED = 'détection suspendue'
/** Sans une image pendant ce temps (flux figé, caméra débranchée), ffmpeg est arrêté et relancé : il ne s'arrêterait jamais seul. */
const STALL_MS = 20_000

/** Une passe : lance ffmpeg et analyse ses images jusqu'à ce qu'il s'arrête. Rend la raison de l'arrêt. */
const run = (
  url: string,
  config: Config,
  onEvent: (event: MotionEvent) => void,
  enabled: () => boolean,
  mask: () => Uint8Array | null,
): Promise<string> =>
  new Promise((resolve) => {
    const frameSize = config.width * config.height
    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-loglevel',
        'error',
        '-rtsp_transport',
        'tcp',
        '-i',
        url,
        '-an',
        '-vf',
        `fps=${config.fps},scale=${config.width}:${config.height},format=gray`,
        '-f',
        'rawvideo',
        '-',
      ],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    )
    track(ffmpeg)
    const detector = createDetector(config.detector)
    let previous: Uint8Array | null = null
    let lastFrameAt = Date.now()
    let pending = Buffer.alloc(0)

    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk])
      lastFrameAt = Date.now()
      // Une image = frameSize octets ; ffmpeg peut en livrer des morceaux, ou plusieurs d'un coup.
      while (pending.length >= frameSize) {
        const frame = Uint8Array.from(pending.subarray(0, frameSize))
        pending = pending.subarray(frameSize)
        if (previous) {
          const event = detector.push(changedShare(previous, frame, config.detector.pixelThreshold, mask()), Date.now() / 1000)
          if (event) onEvent(event)
        }
        previous = frame
      }
    })
    // Détection suspendue (réglage de House Sync) : on arrête ffmpeg, qui ne décode plus le flux pour rien.
    let suspended = false
    let stalled = false
    const watchdog = setInterval(() => {
      if (!enabled()) {
        suspended = true
        ffmpeg.kill()
      } else if (Date.now() - lastFrameAt > STALL_MS) {
        stalled = true
        ffmpeg.kill()
      }
    }, CHECK_MS)
    ffmpeg.on('error', (error) => {
      clearInterval(watchdog)
      resolve(`ffmpeg impossible à lancer : ${error.message}`)
    })
    ffmpeg.on('close', (code) => {
      clearInterval(watchdog)
      resolve(suspended ? SUSPENDED : stalled ? 'flux sans image' : `détection arrêtée (code ${code})`)
    })
  })

/**
 * Surveille le flux léger d'une caméra en continu ; relance ffmpeg s'il s'arrête. Ne rend jamais. `enabled` dit si la
 * détection doit tourner (House Sync la coupe quand les clips de la caméra ne sont pas gardés) ; `onSuspend` est appelé
 * à chaque arrêt de ffmpeg (suspension ou panne), pour fermer l'événement resté ouvert. `mask` rend à chaque image le masque de la zone
 * surveillée (zone.ts), ou null pour toute l'image.
 */
export const watchMotion = async (
  url: string,
  config: Config,
  onEvent: (event: MotionEvent) => void,
  log: (message: string) => void,
  enabled: () => boolean = () => true,
  onSuspend: () => void = () => undefined,
  mask: () => Uint8Array | null = () => null,
): Promise<never> => {
  for (;;) {
    // Suspendue : rien ne tourne, on attend qu'elle revienne.
    while (!enabled()) await new Promise((resolve) => setTimeout(resolve, CHECK_MS))
    const reason = await run(url, config, onEvent, enabled, mask)
    // Un mouvement ouvert quand ffmpeg s'arrête (suspension, flux figé, caméra coupée) ne recevra jamais sa fin : on le ferme.
    onSuspend()
    if (isStopping()) await new Promise<never>(() => undefined)
    if (reason === SUSPENDED) {
      log(`${reason}`)
      continue
    }
    log(`${reason} : nouvel essai dans ${RETRY_SECONDS} s`)
    await new Promise((resolve) => setTimeout(resolve, RETRY_SECONDS * 1000))
  }
}
