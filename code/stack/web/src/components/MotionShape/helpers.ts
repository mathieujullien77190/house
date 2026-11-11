import type { ClipShapes } from '@/lib/api'

/** Une image du journal des contours est montrée au plus ce temps (secondes) après son instant : au-delà, plus rien ne bouge. */
export const SHAPE_HOLD_SECONDS = 0.5

/** Les points d'un polygone pour un SVG de 100 × 100 (un point en parts de l'image devient un pourcentage). */
export const svgPoints = (shape: [number, number][]): string => shape.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')

/** Les polygones à montrer à l'instant `time` (secondes depuis le début du clip) : ceux de la dernière image notée, si elle est assez récente. */
export const shapesAt = (clip: ClipShapes | null, time: number): [number, number][][] => {
  if (!clip) return []
  let found: ClipShapes['frames'][number] | null = null
  for (const frame of clip.frames) {
    if (frame[0] > time) break
    found = frame
  }
  return found && time - found[0] <= SHAPE_HOLD_SECONDS ? found[1] : []
}
