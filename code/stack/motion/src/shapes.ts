// Les contours du mouvement d'un clip : pendant la détection, chaque image en mouvement ajoute une ligne au journal de sa caméra (`<RECORDINGS_DIR>/<caméra>/shapes/<tranche>.jsonl`,
// une tranche = 10 minutes) ; quand le clip est fait, `buildShapesClip` en tire `<id>.shapes.json`, calé sur le début de la vidéo du clip. Le journal est gardé comme les segments.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'

const BUCKET_SECONDS = 600
/** Les contours : une liste de polygones de points [x, y] en parts de l'image. */
export type Shapes = [number, number][][]

/** Le fichier JSON des contours d'un clip, à côté du clip. */
export const shapesClipPath = (clip: string): string => clip.replace(/\.mp4$/, '.shapes.json')

const round = (value: number): number => Math.round(value * 1000) / 1000

/** Ajoute les contours de l'instant `at` (secondes depuis 1970) au journal de la caméra. */
export const appendShapes = (dir: string, at: number, shapes: Shapes): void => {
  if (shapes.length === 0) return
  mkdirSync(dir, { recursive: true })
  const line = JSON.stringify({ t: Math.round(at * 100) / 100, s: shapes.map((shape) => shape.map(([x, y]) => [round(x), round(y)])) })
  appendFileSync(`${dir}/${Math.floor(at / BUCKET_SECONDS) * BUCKET_SECONDS}.jsonl`, `${line}\n`)
}

/** Efface les tranches du journal qui finissent avant `before`. */
export const pruneShapes = (dir: string, before: number): void => {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const start = Number(name.replace(/\.jsonl$/, ''))
    if (Number.isFinite(start) && start + BUCKET_SECONDS < before) rmSync(`${dir}/${name}`, { force: true })
  }
}

/**
 * Écrit le fichier des contours d'un clip : `{"frames": [[secondes depuis le début du clip, contours], ...]}` pour les instants de `from` à `to`.
 * `delay` : les contours sont notés quand le flux léger livre l'image, plus tard que la vidéo ; chaque instant est avancé d'autant (ceux qui tombent avant le début du clip sont écartés).
 * Les instants lus vont de `from` à `to` + `delay`. Rend faux (et n'écrit rien) s'il n'y a aucun contour dans la plage.
 */
export const buildShapesClip = (options: { dir: string; output: string; from: number; to: number; delay?: number }): boolean => {
  const { dir, output, from, to, delay = 0 } = options
  if (!existsSync(dir)) return false
  const frames: [number, Shapes][] = []
  for (const name of readdirSync(dir).sort()) {
    const start = Number(name.replace(/\.jsonl$/, ''))
    if (!Number.isFinite(start) || start + BUCKET_SECONDS < from || start > to + delay) continue
    for (const line of readFileSync(`${dir}/${name}`, 'utf-8').split('\n')) {
      if (!line) continue
      try {
        const entry = JSON.parse(line) as { t: number; s: Shapes }
        const at = entry.t - delay - from
        if (at >= 0 && entry.t <= to + delay) frames.push([Math.round(at * 100) / 100, entry.s])
      } catch {
        // Une ligne coupée (arrêt en pleine écriture) est ignorée.
      }
    }
  }
  if (frames.length === 0) return false
  frames.sort((a, b) => a[0] - b[0])
  writeFileSync(output, JSON.stringify({ frames }))
  return true
}

/** Le type d'un mouvement, ou d'une zone de ce mouvement (en anglais, dans le fichier des contours). */
export type ShapeType = 'rain' | 'foliage' | 'motion'

/**
 * Ajoute des types au fichier des contours d'un clip, une fois l'étiquette du mouvement calculée : `type` pour tout le clip, et pour chaque image un troisième élément,
 * la liste des types de ses zones (dans le même ordre). Pluie : les zones d'au moins `rainHeight` % de la hauteur sont `rain`, les autres `motion` ; feuillage : toutes `foliage`.
 * Rend faux s'il n'y a pas de fichier (clip manuel, clip d'avant les contours).
 */
export const tagShapesClip = (path: string, type: ShapeType, rainHeight: number): boolean => {
  if (!existsSync(path)) return false
  try {
    const clip = JSON.parse(readFileSync(path, 'utf-8')) as { type?: ShapeType; frames: [number, Shapes, ShapeType[]?][] }
    const heightOf = (shape: Shapes[number]): number => (shape.length === 0 ? 0 : Math.round((Math.max(...shape.map(([, y]) => y)) - Math.min(...shape.map(([, y]) => y))) * 100))
    clip.type = type
    clip.frames = clip.frames.map(([time, shapes]) => [
      time,
      shapes,
      shapes.map((shape): ShapeType => (type === 'foliage' ? 'foliage' : type === 'rain' && heightOf(shape) >= rainHeight ? 'rain' : 'motion')),
    ])
    writeFileSync(`${path}.tmp`, JSON.stringify(clip))
    renameSync(`${path}.tmp`, path)
    return true
  } catch {
    return false
  }
}
