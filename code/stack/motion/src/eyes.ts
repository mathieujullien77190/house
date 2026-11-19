// Les yeux qui brillent, la nuit : en infrarouge, l'œil d'un chat renvoie la lumière et devient un point presque blanc, visible bien avant que le reste du chat ne bouge assez
// pour que le détecteur de mouvement s'en aperçoive. Ici, des fonctions pures (sans ffmpeg ni réseau) puis la surveillance du flux principal.
import { spawn } from 'node:child_process'
import { isStopping, track } from './shutdown.ts'

/** Un point de l'image, en parts de sa largeur et de sa hauteur (0 à 1). */
export type EyePoint = [number, number]

export interface EyesConfig {
  /** Luminosité minimale (0 à 255) d'un pixel de reflet. */
  threshold: number
  /** Écart de luminosité minimal avec le plus clair des pixels voisins de l'image d'avant. */
  jump: number
  /** Les voisins comparés dans l'image d'avant : de −radius à +radius pixels (tolère un léger bougé de la caméra). */
  radius: number
  /** Deux pixels de reflet à cette distance ou moins sont du même œil. */
  groupDistance: number
  /** Taille d'une tache de reflet, en pixels : plus petit, c'est du bruit ; plus grand, c'est le corps du chat (le mouvement le voit déjà). */
  minPixels: number
  maxPixels: number
  /** Marge, en pixels, du cadre dessiné autour d'une tache. */
  margin: number
}

export const DEFAULT_EYES: EyesConfig = { threshold: 235, jump: 150, radius: 2, groupDistance: 2, minPixels: 2, maxPixels: 150, margin: 5 }

/**
 * Les cadres des reflets de l'image `current` (niveaux de gris, `width` de large) : un pixel compte s'il est clair (≥ `threshold`), dans la zone surveillée (`mask`, 1 = surveillé)
 * et d'au moins `jump` plus clair que tout son voisinage de l'image `previous` (prise environ deux secondes avant). Les pixels proches sont groupés ; chaque groupe de taille
 * raisonnable donne un cadre (rectangle de 4 sommets, en parts de l'image).
 */
export const findEyes = (
  current: Uint8Array,
  previous: Uint8Array,
  width: number,
  mask: Uint8Array | null = null,
  config: EyesConfig = DEFAULT_EYES,
): EyePoint[][] => {
  if (current.length !== previous.length || current.length === 0 || width <= 0 || (mask && mask.length !== current.length)) return []
  const height = current.length / width
  const lit: number[] = []
  for (let i = 0; i < current.length; i += 1) {
    if (current[i] < config.threshold || (mask && mask[i] === 0)) continue
    const x = i % width
    const y = (i - x) / width
    let before = 0
    for (let ny = Math.max(0, y - config.radius); ny <= Math.min(height - 1, y + config.radius); ny += 1) {
      for (let nx = Math.max(0, x - config.radius); nx <= Math.min(width - 1, x + config.radius); nx += 1) before = Math.max(before, previous[ny * width + nx])
    }
    if (current[i] - before >= config.jump) lit.push(i)
  }
  if (lit.length === 0) return []
  const pending = new Set(lit)
  const boxes: EyePoint[][] = []
  for (const start of lit) {
    if (!pending.has(start)) continue
    pending.delete(start)
    const stack = [start]
    let size = 0
    let x0 = width
    let y0 = height
    let x1 = 0
    let y1 = 0
    while (stack.length > 0) {
      const at = stack.pop() as number
      const x = at % width
      const y = (at - x) / width
      size += 1
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
      for (let dy = -config.groupDistance; dy <= config.groupDistance; dy += 1) {
        for (let dx = -config.groupDistance; dx <= config.groupDistance; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const index = ny * width + nx
          if (pending.has(index)) {
            pending.delete(index)
            stack.push(index)
          }
        }
      }
    }
    if (size < config.minPixels || size > config.maxPixels) continue
    const left = Math.max(0, x0 - config.margin) / width
    const right = Math.min(width, x1 + 1 + config.margin) / width
    const top = Math.max(0, y0 - config.margin) / height
    const bottom = Math.min(height, y1 + 1 + config.margin) / height
    boxes.push([
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ])
  }
  return boxes
}

const RETRY_SECONDS = 5
const CHECK_MS = 1000
const STALL_MS = 30_000
/** L'image de référence a au moins cet âge (secondes) : les images clés de la caméra arrivent toutes les 2 s, la précédente convient. */
const MIN_REFERENCE_AGE_SECONDS = 1.5
const MAX_REFERENCE_AGE_SECONDS = 6

/** Une passe : ffmpeg ne décode que les images clés du flux principal (peu de processeur), réduites en niveaux de gris ; chacune est comparée à la précédente. */
const run = (
  url: string,
  size: { width: number; height: number },
  enabled: () => boolean,
  mask: () => Uint8Array | null,
  onEyes: (boxes: EyePoint[][]) => void,
): Promise<string> =>
  new Promise((resolve) => {
    const frameSize = size.width * size.height
    const ffmpeg = spawn(
      'ffmpeg',
      ['-loglevel', 'error', '-skip_frame', 'nokey', '-rtsp_transport', 'tcp', '-i', url, '-an', '-vf', `scale=${size.width}:${size.height},format=gray`, '-vsync', '0', '-f', 'rawvideo', '-'],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    )
    track(ffmpeg)
    let pending = Buffer.alloc(0)
    let lastFrameAt = Date.now()
    const history: { at: number; frame: Uint8Array }[] = []
    ffmpeg.stdout.on('data', (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk])
      while (pending.length >= frameSize) {
        const frame = Uint8Array.from(pending.subarray(0, frameSize))
        pending = pending.subarray(frameSize)
        const now = Date.now()
        lastFrameAt = now
        // La référence : l'image la plus récente qui a au moins 1,5 s.
        const reference = [...history].reverse().find((item) => now - item.at >= MIN_REFERENCE_AGE_SECONDS * 1000)
        history.push({ at: now, frame })
        while (history.length > 0 && now - history[0].at > MAX_REFERENCE_AGE_SECONDS * 1000) history.shift()
        if (reference) onEyes(findEyes(frame, reference.frame, size.width, mask()))
      }
    })
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
      resolve(suspended ? 'recherche des yeux suspendue' : stalled ? 'flux sans image' : `recherche des yeux arrêtée (code ${code})`)
    })
  })

/** Cherche les yeux sur le flux principal d'une caméra tant que `enabled` le dit (House Sync : réglage allumé et nuit) ; relance ffmpeg s'il s'arrête. Ne rend jamais. */
export const watchEyes = async (
  url: string,
  size: { width: number; height: number },
  enabled: () => boolean,
  mask: () => Uint8Array | null,
  onEyes: (boxes: EyePoint[][]) => void,
  log: (message: string) => void,
): Promise<never> => {
  for (;;) {
    while (!enabled()) await new Promise((resolve) => setTimeout(resolve, CHECK_MS))
    log('recherche des yeux allumée')
    const reason = await run(url, size, enabled, mask, onEyes)
    onEyes([])
    if (isStopping()) await new Promise<never>(() => undefined)
    if (reason.endsWith('suspendue')) {
      log(reason)
      continue
    }
    log(`${reason} : nouvel essai dans ${RETRY_SECONDS} s`)
    await new Promise((resolve) => setTimeout(resolve, RETRY_SECONDS * 1000))
  }
}
