// Le son des caméras de AUDIO_CAMERAS : ffmpeg copie la piste audio du flux léger (AAC, sans transcodage ni image) en petits fichiers de quelques secondes,
// comme les segments vidéo (gardés quelques heures seulement), nommés par leur heure de début (secondes depuis 1970, `1794071400.aac`).
// Le son n'est CONSERVÉ que pour les clips de détection de mouvement : `buildAudioClip` en fait un fichier son par clip (`<id>.aac`), à côté du clip,
// calé sur le début de sa vidéo. Les segments vidéo, les clips et leurs copies restent sans son : le son est toujours un fichier à part.
// Le format ADTS (.aac) se lit au fil de l'eau et se met bout à bout par simple concaténation d'octets.
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { isStopping, track } from './shutdown.ts'

const RETRY_SECONDS = 5
const WATCH_MS = 10_000

/** L'heure de début d'un fichier son, d'après son nom (`1794071400.aac`), ou null si ce n'en est pas un. */
export const audioStart = (name: string): number | null => {
  const match = /^(\d+)\.aac$/.exec(name)
  return match ? Number(match[1]) : null
}

/** Les heures de début des fichiers son d'un dossier, du plus ancien au plus récent. */
export const listAudioStarts = (dir: string): number[] => {
  try {
    return readdirSync(dir).map(audioStart).filter((start): start is number => start !== null).sort((a, b) => a - b)
  } catch {
    return []
  }
}

/** Supprime les fichiers son qui ont commencé avant `before` (secondes) ; rend leur nombre. */
export const pruneAudio = (dir: string, before: number): number => {
  let removed = 0
  for (const start of listAudioStarts(dir)) {
    if (start < before) {
      try {
        unlinkSync(`${dir}/${start}.aac`)
        removed += 1
      } catch {
        // déjà parti : rien à faire
      }
    }
  }
  return removed
}

/** Les fichiers son (par heure de début, du plus ancien au plus récent) qui recouvrent [from, to], avec un fichier de marge comme pour les segments vidéo. */
export const selectAudio = (starts: number[], from: number, to: number, segmentSeconds: number): number[] =>
  starts.filter((start) => start + segmentSeconds * 2 > from && start < to).sort((a, b) => a - b)

/** Le nom du son d'un clip : `<id>.mp4` devient `<id>.aac`. */
export const audioClipPath = (clip: string): string => clip.replace(/\.mp4$/, '.aac')

/** Enregistre en continu le son d'une caméra par petits fichiers ; relance ffmpeg s'il s'arrête. Ne rend jamais. */
export const recordAudio = async (url: string, dir: string, segmentSeconds: number, log: (message: string) => void): Promise<never> => {
  mkdirSync(dir, { recursive: true })
  for (;;) {
    const reason = await new Promise<string>((resolve) => {
      const ffmpeg = spawn(
        'ffmpeg',
        [
          '-loglevel', 'error',
          '-rtsp_transport', 'tcp',
          '-i', url,
          '-vn',
          '-c:a', 'copy',
          '-f', 'segment',
          '-segment_time', String(segmentSeconds),
          '-segment_format', 'adts',
          '-strftime', '1',
          '-reset_timestamps', '1',
          `${dir}/%s.aac`,
        ],
        { stdio: ['ignore', 'ignore', 'inherit'] },
      )
      track(ffmpeg)
      const startedAt = Date.now() / 1000
      let stalled = false
      // Un fichier qui n'arrive plus (flux figé, caméra débranchée) : ffmpeg est arrêté puis relancé.
      const watchdog = setInterval(() => {
        const newest = Math.max(startedAt, ...listAudioStarts(dir))
        if (Date.now() / 1000 - newest > Math.max(30, 3 * segmentSeconds)) {
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
        resolve(stalled ? 'enregistrement du son figé' : `enregistrement du son arrêté (code ${code})`)
      })
    })
    if (isStopping()) await new Promise<never>(() => undefined)
    log(`${reason} : nouvel essai dans ${RETRY_SECONDS} s`)
    await new Promise((resolve) => setTimeout(resolve, RETRY_SECONDS * 1000))
  }
}

export interface AudioClipRequest {
  /** Le dossier des petits fichiers son de la caméra. */
  dir: string
  output: string
  /** Le début de la vidéo du clip : le son démarre là (à une image audio près, 64 ms), pour suivre la vidéo. */
  from: number
  to: number
  segmentSeconds: number
  /** Le gain en dB appliqué au son du clip (le micro des caméras est très faible) ; 0 : le son tel quel, sans le recoder. */
  gainDb?: number
}

/** Les options d'ffmpeg pour le son d'un clip : copié tel quel sans gain ; avec un gain, amplifié puis recodé en AAC, un limiteur évitant la saturation. */
export const encodeArgs = (gainDb: number): string[] =>
  gainDb > 0 ? ['-af', `volume=${gainDb}dB,alimiter=limit=0.95`, '-c:a', 'aac', '-b:a', '64k', '-ar', '16000'] : ['-c:a', 'copy']

/**
 * Fabrique le son d'un clip : les petits fichiers qui le recouvrent, mis bout à bout (concaténation d'octets, le format ADTS le permet sans décalage),
 * puis coupés au début de la vidéo du clip et à sa fin, sans transcodage. Rend faux s'il n'y avait aucun son (rien n'est écrit). Écrit dans un fichier
 * temporaire puis renommé : on ne sert jamais un son à moitié fait.
 */
export const buildAudioClip = async (request: AudioClipRequest): Promise<boolean> => {
  const starts = selectAudio(listAudioStarts(request.dir), request.from, request.to, request.segmentSeconds).filter((start) => {
    try {
      return statSync(`${request.dir}/${start}.aac`).size > 0
    } catch {
      return false
    }
  })
  const first = starts[0]
  if (first === undefined) return false
  mkdirSync(dirname(request.output), { recursive: true })
  const joined = `${request.output}.join`
  const partial = `${request.output}.part.aac`
  writeFileSync(joined, Buffer.concat(starts.map((start) => readFileSync(`${request.dir}/${start}.aac`))))
  const offset = Math.max(0, request.from - first)
  const duration = Math.max(1, request.to - Math.max(request.from, first))
  try {
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-i', joined, '-ss', String(offset), '-t', String(duration), ...encodeArgs(request.gainDb ?? 0), '-f', 'adts', partial], {
        stdio: ['ignore', 'ignore', 'inherit'],
      })
      ffmpeg.on('error', reject)
      ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg a rendu ${code}`))))
    })
    renameSync(partial, request.output)
    return true
  } finally {
    rmSync(joined, { force: true })
    rmSync(partial, { force: true })
  }
}
