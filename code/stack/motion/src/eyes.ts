// Les yeux qui brillent : la nuit, les caméras sont infrarouges et monochromes, et l'œil d'un animal y fait un tout petit point blanc saturé, sur un fond sombre.
// Rien d'autre ne brille autant : un petit amas de pixels presque blancs (>= 250), entouré de gris sombre, est un œil. Fonctions pures, plus le décodage d'un JPEG par ffmpeg.
// Les seuils sont réglés sur des images de 1280 × 720 (les images de Sync), mesurés sur de vraies images de nuit.
import { spawn } from 'node:child_process'

/** Un œil trouvé, en pixels de l'image analysée. */
export interface Eye {
  x: number
  y: number
  /** La surface du point, en pixels. */
  size: number
  /** Le gris le plus clair du point (255 : saturé). */
  peak: number
  /** L'écart entre le point et la moyenne du gris tout autour. */
  contrast: number
}

export interface EyesResult {
  /** Au moins un œil. */
  found: boolean
  /** Deux yeux voisins : un indice de plus, jamais une condition. */
  pair: boolean
  /** La distance entre deux yeux voisins (0 sans paire), en pixels. */
  distance: number
  eyes: Eye[]
}

/** Un pixel est presque blanc à partir de ce gris. */
export const PEAK_MIN = 250
/** La surface d'un œil, en pixels (un amas plus gros est une tache, un pixel seul un défaut du capteur) et son plus grand côté. */
export const AREA_MIN = 3
export const AREA_MAX = 25
export const SIDE_MAX = 7
/** Le fond doit être sombre : moyenne du gris dans l'anneau de 3 à 6 pixels autour du point. */
export const RING_MAX = 120
/** Une image où plus de points clairs que ça brillent (lampe, feuillage éclairé) est trop chargée : rien n'y est un œil. */
export const BLOBS_MAX = 8
/** Deux yeux d'une paire sont à cette distance l'un de l'autre, en pixels. */
export const PAIR_MIN = 4
export const PAIR_MAX = 30

interface Blob {
  x: number
  y: number
  area: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Les amas (8 voisins) de pixels presque blancs de plus d'un pixel ; null s'il y en a plus de `limit`. */
const findBlobs = (gray: Uint8Array, width: number, height: number, limit: number): Blob[] | null => {
  const seen = new Uint8Array(gray.length)
  const stack = new Int32Array(gray.length)
  const blobs: Blob[] = []
  for (let start = 0; start < gray.length; start += 1) {
    if (seen[start] || gray[start] < PEAK_MIN) continue
    let top = 0
    stack[top++] = start
    seen[start] = 1
    const blob: Blob = { x: 0, y: 0, area: 0, minX: width, maxX: 0, minY: height, maxY: 0 }
    while (top > 0) {
      const index = stack[--top]
      const px = index % width
      const py = (index - px) / width
      blob.area += 1
      blob.x += px
      blob.y += py
      blob.minX = Math.min(blob.minX, px)
      blob.maxX = Math.max(blob.maxX, px)
      blob.minY = Math.min(blob.minY, py)
      blob.maxY = Math.max(blob.maxY, py)
      for (let ny = Math.max(0, py - 1); ny <= Math.min(height - 1, py + 1); ny += 1) {
        for (let nx = Math.max(0, px - 1); nx <= Math.min(width - 1, px + 1); nx += 1) {
          const next = ny * width + nx
          if (seen[next] || gray[next] < PEAK_MIN) continue
          seen[next] = 1
          stack[top++] = next
        }
      }
    }
    if (blob.area < 2) continue
    blob.x /= blob.area
    blob.y /= blob.area
    blobs.push(blob)
    if (blobs.length > limit) return null
  }
  return blobs
}

/** La moyenne du gris dans l'anneau de 3 à 6 pixels autour du point ; null si l'anneau sort de l'image. */
const ringMean = (gray: Uint8Array, width: number, height: number, blob: Blob): number | null => {
  const x0 = blob.minX - 6
  const x1 = blob.maxX + 6
  const y0 = blob.minY - 6
  const y1 = blob.maxY + 6
  if (x0 < 0 || y0 < 0 || x1 >= width || y1 >= height) return null
  let sum = 0
  let count = 0
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (x >= blob.minX - 3 && x <= blob.maxX + 3 && y >= blob.minY - 3 && y <= blob.maxY + 3) continue
      sum += gray[y * width + x]
      count += 1
    }
  }
  return sum / count
}

/** Cherche des yeux qui brillent dans une image grise (width × height octets). */
export const detectEyes = (gray: Uint8Array, width: number, height: number): EyesResult => {
  const none: EyesResult = { found: false, pair: false, distance: 0, eyes: [] }
  if (width <= 0 || height <= 0 || gray.length !== width * height) return none
  const blobs = findBlobs(gray, width, height, BLOBS_MAX)
  if (blobs === null) return none
  const eyes: Eye[] = []
  for (const blob of blobs) {
    if (blob.area < AREA_MIN || blob.area > AREA_MAX || blob.maxX - blob.minX >= SIDE_MAX || blob.maxY - blob.minY >= SIDE_MAX) continue
    const ring = ringMean(gray, width, height, blob)
    if (ring === null || ring >= RING_MAX) continue
    eyes.push({ x: Math.round(blob.x), y: Math.round(blob.y), size: blob.area, peak: 255, contrast: Math.round(255 - ring) })
  }
  eyes.sort((a, b) => b.contrast - a.contrast)
  let distance = 0
  for (const other of eyes.slice(1)) {
    const d = Math.hypot(other.x - eyes[0].x, other.y - eyes[0].y)
    if (d >= PAIR_MIN && d <= PAIR_MAX) {
      distance = Math.round(d * 10) / 10
      break
    }
  }
  return { found: eyes.length > 0, pair: distance > 0, distance, eyes }
}

/** Lit une image PGM binaire (P5, 8 bits) : ses dimensions et ses pixels. */
export const parsePgm = (data: Buffer): { width: number; height: number; gray: Uint8Array } | null => {
  const match = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(data.subarray(0, 64).toString('latin1'))
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  const offset = match[0].length
  if (width <= 0 || height <= 0 || data.length < offset + width * height) return null
  return { width, height, gray: new Uint8Array(data.buffer, data.byteOffset + offset, width * height) }
}

/** Décode un JPEG en image grise PGM ; null si l'image ne se décode pas. */
export type Decoder = (jpeg: Buffer) => Promise<Buffer | null>

/** Le décodeur de production : ffmpeg (JPEG sur l'entrée standard, PGM sur la sortie), arrêté au bout de 10 s. */
export const ffmpegDecoder: Decoder = (jpeg) =>
  new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-loglevel', 'error', '-i', 'pipe:0', '-f', 'image2pipe', '-vcodec', 'pgm', '-pix_fmt', 'gray', 'pipe:1'], {
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    const chunks: Buffer[] = []
    const timer = setTimeout(() => ffmpeg.kill(), 10_000)
    ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    ffmpeg.stdin.on('error', () => undefined)
    ffmpeg.on('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
    ffmpeg.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0 ? Buffer.concat(chunks) : null)
    })
    ffmpeg.stdin.end(jpeg)
  })

/** Les yeux d'un JPEG ; null si l'image ne se décode pas. */
export const eyesFromJpeg = async (jpeg: Buffer, decode: Decoder = ffmpegDecoder): Promise<EyesResult | null> => {
  const decoded = await decode(jpeg)
  const image = decoded === null ? null : parsePgm(decoded)
  return image === null ? null : detectEyes(image.gray, image.width, image.height)
}
