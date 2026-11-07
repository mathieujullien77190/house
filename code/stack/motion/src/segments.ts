// L'enregistrement par segments : ffmpeg copie le flux principal tel quel (sans transcodage) en fichiers de
// quelques secondes, nommés par leur heure de début (secondes depuis 1970). On n'en garde que `retention` secondes.
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { isStopping, track } from './shutdown.ts'

const RETRY_SECONDS = 5

/** L'heure de début d'un segment, d'après son nom (`1792953695.ts`), ou null si ce n'en est pas un. */
export const segmentStart = (name: string): number | null => {
  const match = /^(\d+)\.ts$/.exec(name)
  return match ? Number(match[1]) : null
}

/**
 * Les segments (par heure de début, du plus ancien au plus récent) qui recouvrent [from, to]. Un segment dure à peu
 * près `segmentSeconds` : il en faut un de marge, car ffmpeg coupe sur une image clé, pas à la seconde près.
 */
export const selectSegments = (starts: number[], from: number, to: number, segmentSeconds: number): number[] =>
  starts.filter((start) => start + segmentSeconds * 2 > from && start < to).sort((a, b) => a - b)

export const listSegmentStarts = (dir: string): number[] => {
  try {
    return readdirSync(dir).map(segmentStart).filter((start): start is number => start !== null).sort((a, b) => a - b)
  } catch {
    return []
  }
}

/** Supprime les segments plus vieux que `before` (secondes) ; rend leur nombre. */
export const pruneSegments = (dir: string, before: number): number => {
  let removed = 0
  for (const start of listSegmentStarts(dir)) {
    if (start < before) {
      try {
        unlinkSync(`${dir}/${start}.ts`)
        removed += 1
      } catch {
        // déjà parti : rien à faire
      }
    }
  }
  return removed
}

/** Enregistre en continu le flux d'une caméra ; relance ffmpeg s'il s'arrête. Ne rend jamais. */
/** Un segment qui n'arrive plus (flux figé, caméra débranchée) : ffmpeg est arrêté au bout de ce nombre de durées de segment, puis relancé. */
const STALL_SEGMENTS = 3
const WATCH_MS = 10_000

export const recordSegments = async (url: string, dir: string, segmentSeconds: number, log: (message: string) => void): Promise<never> => {
  mkdirSync(dir, { recursive: true })
  for (;;) {
    const reason = await new Promise<string>((resolve) => {
      const ffmpeg = spawn(
        'ffmpeg',
        [
          '-loglevel', 'error',
          '-rtsp_transport', 'tcp',
          '-i', url,
          '-an',
          '-c', 'copy',
          '-f', 'segment',
          '-segment_time', String(segmentSeconds),
          '-segment_format', 'mpegts',
          '-strftime', '1',
          '-reset_timestamps', '1',
          `${dir}/%s.ts`,
        ],
        { stdio: ['ignore', 'ignore', 'inherit'] },
      )
      track(ffmpeg)
      const startedAt = Date.now() / 1000
      let stalled = false
      const watchdog = setInterval(() => {
        const newest = Math.max(startedAt, ...listSegmentStarts(dir))
        if (Date.now() / 1000 - newest > Math.max(30, STALL_SEGMENTS * segmentSeconds)) {
          stalled = true
          ffmpeg.kill()
        }
      }, WATCH_MS)
      ffmpeg.on('error', (error) => {
        clearInterval(watchdog)
        resolve(`ffmpeg impossible à lancer : ${error.message}`)
      })
      ffmpeg.on('close', (code) => {
        clearInterval(watchdog)
        resolve(stalled ? 'enregistrement sans nouveau segment' : `enregistrement arrêté (code ${code})`)
      })
    })
    if (isStopping()) await new Promise<never>(() => undefined)
    log(`${reason} : nouvel essai dans ${RETRY_SECONDS} s`)
    await new Promise((resolve) => setTimeout(resolve, RETRY_SECONDS * 1000))
  }
}
