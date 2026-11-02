// Un clip = les segments qui recouvrent l'événement (avec un peu avant et après), mis bout à bout sans
// transcodage dans un MP4 que le navigateur sait lire.
import { spawn } from 'node:child_process'
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
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
    const starts = selectSegments(listSegmentStarts(request.cameraDir), request.from, request.to, request.segmentSeconds)
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
      unlinkSync(list)
      reject(error)
    })
    ffmpeg.on('close', (code) => {
      try {
        unlinkSync(list)
      } catch {
        // déjà parti
      }
      if (code === 0) resolve({ segments: starts.length, start: starts[0] })
      else reject(new Error(`ffmpeg a rendu ${code}`))
    })
  })
