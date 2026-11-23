// Les hauteurs des zones de chaque image en mouvement, pour calculer l'étiquette d'un événement (pluie, feuillage) une fois le mouvement fini et fusionné.
// Un journal par caméra (`<RECORDINGS_DIR>/<caméra>/stats/<tranche de 10 min>.jsonl`, une ligne par image : l'instant et la hauteur, en % de l'image, de CHAQUE zone cherchée,
// jusqu'à 60 : le journal des contours (shapes.ts) n'en garde que 8). Gardé comme les segments.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'

const BUCKET_SECONDS = 600

/** Une image en mouvement : son instant (secondes depuis 1970) et la hauteur de chaque zone (% de la hauteur de l'image). */
export interface StatFrame {
  t: number
  h: number[]
}

/** Les hauteurs, en % entiers de la hauteur de l'image, des zones (polygones de points [x, y] en parts de l'image). */
export const heightPercents = (shapes: [number, number][][]): number[] =>
  shapes.filter((shape) => shape.length > 0).map((shape) => Math.round((Math.max(...shape.map(([, y]) => y)) - Math.min(...shape.map(([, y]) => y))) * 100))

export const appendStats = (dir: string, at: number, heights: number[]): void => {
  if (heights.length === 0) return
  mkdirSync(dir, { recursive: true })
  appendFileSync(`${dir}/${Math.floor(at / BUCKET_SECONDS) * BUCKET_SECONDS}.jsonl`, `${JSON.stringify({ t: Math.round(at * 100) / 100, h: heights })}\n`)
}

/** Les images notées entre `from` et `to` (secondes), dans l'ordre. */
export const readStats = (dir: string, from: number, to: number): StatFrame[] => {
  if (!existsSync(dir)) return []
  const frames: StatFrame[] = []
  for (const name of readdirSync(dir).sort()) {
    const start = Number(name.replace(/\.jsonl$/, ''))
    if (!Number.isFinite(start) || start + BUCKET_SECONDS < from || start > to) continue
    for (const line of readFileSync(`${dir}/${name}`, 'utf-8').split('\n')) {
      if (!line) continue
      try {
        const entry = JSON.parse(line) as StatFrame
        if (entry.t >= from && entry.t <= to) frames.push(entry)
      } catch {
        // Une ligne coupée (arrêt en pleine écriture) est ignorée.
      }
    }
  }
  return frames
}

/**
 * Les mêmes images, relues dans le journal des contours (shapes.ts : `{t, s: polygones}`, les 8 plus grands par image) pour les mouvements d'avant le journal des hauteurs.
 * Moins de zones que le journal des hauteurs (8 au plus par image), mais les plus grandes, donc les plus hautes.
 */
export const readShapeStats = (dir: string, from: number, to: number): StatFrame[] => {
  if (!existsSync(dir)) return []
  const frames: StatFrame[] = []
  for (const name of readdirSync(dir).sort()) {
    const start = Number(name.replace(/\.jsonl$/, ''))
    if (!Number.isFinite(start) || start + BUCKET_SECONDS < from || start > to) continue
    for (const line of readFileSync(`${dir}/${name}`, 'utf-8').split('\n')) {
      if (!line) continue
      try {
        const entry = JSON.parse(line) as { t: number; s: [number, number][][] }
        if (entry.t >= from && entry.t <= to) frames.push({ t: entry.t, h: heightPercents(entry.s) })
      } catch {
        // Une ligne coupée (arrêt en pleine écriture) est ignorée.
      }
    }
  }
  return frames
}

/** Efface les tranches qui finissent avant `before`. */
export const pruneStats = (dir: string, before: number): void => {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const start = Number(name.replace(/\.jsonl$/, ''))
    if (Number.isFinite(start) && start + BUCKET_SECONDS < before) rmSync(`${dir}/${name}`, { force: true })
  }
}

/** Les réglages qui décident de l'étiquette d'un mouvement (0 zone = coupé). */
export interface LabelSettings {
  /** Feuillage : au moins ce nombre de zones sur au moins FOLIAGE_SHARE des images (au moins FOLIAGE_MIN_FRAMES images). */
  foliageZones: number
  /** Pluie : au moins ce nombre de zones d'au moins `rainHeight` % de la hauteur par minute, en moyenne sur la durée du mouvement. */
  rainZones: number
  rainHeight: number
}

/** La durée minimale prise pour calculer la moyenne : un mouvement plus court compte comme s'il durait ce temps (sinon deux zones en une seconde feraient 120 par minute). */
export const MIN_RAIN_SECONDS = 10

/** La moyenne de zones d'au moins `minHeight` % de hauteur par minute : le total des zones hautes de toutes les images, divisé par la durée du mouvement. */
export const tallPerMinute = (frames: StatFrame[], minHeight: number, durationSeconds: number): number => {
  const total = frames.reduce((sum, frame) => sum + frame.h.filter((height) => height >= minHeight).length, 0)
  return (total * 60) / Math.max(durationSeconds, MIN_RAIN_SECONDS)
}

export const FOLIAGE_SHARE = 0.3
export const FOLIAGE_MIN_FRAMES = 5

/** L'étiquette d'un mouvement d'après toutes ses images : la pluie l'emporte sur le feuillage ; rien : un mouvement ordinaire. */
export const labelOf = (frames: StatFrame[], settings: LabelSettings, durationSeconds: number): 'rain' | 'foliage' | null => {
  if (settings.rainZones > 0) {
    if (tallPerMinute(frames, settings.rainHeight, durationSeconds) >= settings.rainZones) return 'rain'
  }
  if (settings.foliageZones > 0 && frames.length >= FOLIAGE_MIN_FRAMES) {
    const leafy = frames.filter((frame) => frame.h.length >= settings.foliageZones).length
    if (leafy / frames.length >= FOLIAGE_SHARE) return 'foliage'
  }
  return null
}
