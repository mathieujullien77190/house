// Un clip = les segments qui recouvrent l'événement (avec un peu avant et après), mis bout à bout sans
// transcodage dans un MP4 H.265 4K (l'original) ; une copie H.264 720p (`buildWebClip`) se lit sur tous les appareils.
import { spawn } from 'node:child_process'
import { mkdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { listSegmentStarts, selectSegments } from './segments.ts'

export interface ClipRequest {
  /** Le dossier des segments de la caméra. */
  cameraDir: string
  output: string
  from: number
  to: number
  segmentSeconds: number
  videoTag: string
}

export interface ClipResult {
  segments: number
  /** Début réel du clip, en secondes depuis 1970 : le début de son premier segment. */
  start: number
}

/** Construit le clip ; rend le nombre de segments utilisés (0 s'il n'y en avait aucun : rien n'est écrit) et son début réel. */
export const buildClip = (request: ClipRequest): Promise<ClipResult> =>
  new Promise((resolve, reject) => {
    // Un segment vide (la caméra redémarrait) ferait échouer ffmpeg à chaque essai : on le saute.
    const starts = selectSegments(listSegmentStarts(request.cameraDir), request.from, request.to, request.segmentSeconds).filter(
      (start) => statSync(`${request.cameraDir}/${start}.ts`).size > 0,
    )
    if (starts.length === 0) {
      resolve({ segments: 0, start: 0 })
      return
    }
    mkdirSync(dirname(request.output), { recursive: true })
    const list = `${request.output}.txt`
    writeFileSync(list, starts.map((start) => `file '${request.cameraDir}/${start}.ts'`).join('\n'))
    const tag = request.videoTag ? ['-tag:v', request.videoTag] : []
    const ffmpeg = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-an', '-c', 'copy', ...tag, '-movflags', '+faststart', request.output], {
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    ffmpeg.on('error', (error) => {
      rmSync(list, { force: true })
      reject(error)
    })
    ffmpeg.on('close', (code) => {
      rmSync(list, { force: true })
      if (code === 0) resolve({ segments: starts.length, start: starts[0] })
      else {
        // Un clip à moitié écrit ne reste pas sous son vrai nom : on le jette, il sera refait.
        rmSync(request.output, { force: true })
        reject(new Error(`ffmpeg a rendu ${code}`))
      }
    })
  })

/** Le nom de la copie légère d'un clip : `<id>.mp4` devient `<id>.h264.mp4`. */
export const webClipPath = (clip: string): string => clip.replace(/\.mp4$/, '.h264.mp4')

/**
 * La copie H.264 720p d'un clip H.265 4K : environ 1 Mb/s, lisible par tous les navigateurs et légère en 4G.
 * Écrite dans un fichier temporaire puis renommée, pour qu'on ne serve jamais une copie à moitié faite.
 */
export const buildWebClip = (input: string, output: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const partial = `${output}.part.mp4`
    const args = ['-loglevel', 'error', '-y', '-i', input, '-an', '-vf', 'scale=-2:720', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', partial]
    const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] })
    ffmpeg.on('error', reject)
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        rmSync(partial, { force: true })
        reject(new Error(`ffmpeg a rendu ${code}`))
        return
      }
      renameSync(partial, output)
      resolve()
    })
  })
