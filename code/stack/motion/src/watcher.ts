// La surveillance du mouvement d'une caméra : ffmpeg lit le flux léger (images grises 160×90, 5 par seconde) sur sa
// sortie, on compare chaque image à la précédente (detector.ts) et on rend chaque début et chaque fin de mouvement.
import { spawn } from 'node:child_process'
import type { Config } from './config.ts'
import { changedShare, createDetector, type MotionEvent } from './detector.ts'

const RETRY_SECONDS = 5

/** Une passe : lance ffmpeg et analyse ses images jusqu'à ce qu'il s'arrête. Rend la raison de l'arrêt. */
const run = (url: string, config: Config, onEvent: (event: MotionEvent) => void): Promise<string> =>
  new Promise((resolve) => {
    const frameSize = config.width * config.height
    const ffmpeg = spawn(
      'ffmpeg',
      ['-loglevel', 'error', '-rtsp_transport', 'tcp', '-i', url, '-an', '-vf', `fps=${config.fps},scale=${config.width}:${config.height},format=gray`, '-f', 'rawvideo', '-'],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    )
    const detector = createDetector(config.detector)
    let previous: Uint8Array | null = null
    let pending = Buffer.alloc(0)

    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk])
      // Une image = frameSize octets ; ffmpeg peut en livrer des morceaux, ou plusieurs d'un coup.
      while (pending.length >= frameSize) {
        const frame = Uint8Array.from(pending.subarray(0, frameSize))
        pending = pending.subarray(frameSize)
        if (previous) {
          const event = detector.push(changedShare(previous, frame, config.detector.pixelThreshold), Date.now() / 1000)
          if (event) onEvent(event)
        }
        previous = frame
      }
    })
    ffmpeg.on('error', (error) => resolve(`ffmpeg impossible à lancer : ${error.message}`))
    ffmpeg.on('close', (code) => resolve(`détection arrêtée (code ${code})`))
    process.once('SIGTERM', () => ffmpeg.kill())
    process.once('SIGINT', () => ffmpeg.kill())
  })

/** Surveille le flux léger d'une caméra en continu ; relance ffmpeg s'il s'arrête. Ne rend jamais. */
export const watchMotion = async (url: string, config: Config, onEvent: (event: MotionEvent) => void, log: (message: string) => void): Promise<never> => {
  for (;;) {
    const reason = await run(url, config, onEvent)
    log(`${reason} : nouvel essai dans ${RETRY_SECONDS} s`)
    await new Promise((resolve) => setTimeout(resolve, RETRY_SECONDS * 1000))
  }
}
