// Les formes du plan, en points du plan : rectangles, ronds, champ de vision, et les chemins SVG (M L H V A Z) du plan découpés en points.
import type { Point } from './projection'

const ARC_STEPS = 32

export const rectRing = (x: number, y: number, w: number, h: number): Point[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
]

export const circleRing = (cx: number, cy: number, radius: number, steps = 32): Point[] =>
  Array.from({ length: steps }, (_, index): Point => {
    const angle = (index / steps) * 2 * Math.PI
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
  })

/** Un point à la distance `radius` de (x, y), dans la direction `angle` (degrés depuis le haut du plan, sens des aiguilles d'une montre). */
export const polar = (x: number, y: number, angle: number, radius: number): Point => {
  const radians = (angle * Math.PI) / 180
  return [x + radius * Math.sin(radians), y - radius * Math.cos(radians)]
}

/** Le champ de vision d'une caméra : un cône, une part de disque dont la pointe est la caméra, de rayon `far`, de part et d'autre de sa direction. */
export const coneRing = (x: number, y: number, angle: number, fov: number, far: number, steps = 24): Point[] => {
  const from = angle - fov / 2
  return [[x, y], ...Array.from({ length: steps + 1 }, (_, index) => polar(x, y, from + (fov * index) / steps, far))]
}

/** Un arc de cercle (rayon unique) d'un point à l'autre, comme la commande A du SVG : la suite de points, départ exclu. */
const arcPoints = (from: Point, radius: number, large: boolean, sweep: boolean, to: Point): Point[] => {
  const dx = (from[0] - to[0]) / 2
  const dy = (from[1] - to[1]) / 2
  const half = dx * dx + dy * dy
  if (half === 0) return []
  const r = Math.max(radius, Math.sqrt(half))
  const coefficient = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (r * r - half) / half))
  const cx = coefficient * dy + (from[0] + to[0]) / 2
  const cy = -coefficient * dx + (from[1] + to[1]) / 2
  const start = Math.atan2(from[1] - cy, from[0] - cx)
  let delta = Math.atan2(to[1] - cy, to[0] - cx) - start
  if (!sweep && delta > 0) delta -= 2 * Math.PI
  if (sweep && delta < 0) delta += 2 * Math.PI
  return Array.from({ length: ARC_STEPS }, (_, index): Point => {
    const angle = start + (delta * (index + 1)) / ARC_STEPS
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  })
}

/** Un chemin SVG (commandes absolues M L H V A Z, arcs de cercle) découpé en contours de points. */
export const pathRings = (d: string): Point[][] => {
  const tokens = d.match(/[MLHVAZ]|-?\d*\.?\d+/g) ?? []
  const rings: Point[][] = []
  let ring: Point[] = []
  let at: Point = [0, 0]
  let index = 0
  const number = () => Number(tokens[index++])
  while (index < tokens.length) {
    const command = tokens[index++]
    if (command === 'M') {
      if (ring.length > 1) rings.push(ring)
      at = [number(), number()]
      ring = [at]
    } else if (command === 'L') {
      at = [number(), number()]
      ring.push(at)
    } else if (command === 'H') {
      at = [number(), at[1]]
      ring.push(at)
    } else if (command === 'V') {
      at = [at[0], number()]
      ring.push(at)
    } else if (command === 'A') {
      const radius = number()
      number()
      number()
      const large = number() === 1
      const sweep = number() === 1
      const to: Point = [number(), number()]
      ring.push(...arcPoints(at, radius, large, sweep, to))
      at = to
    } else if (command === 'Z') {
      if (ring.length > 1) rings.push(ring)
      ring = []
    }
  }
  if (ring.length > 1) rings.push(ring)
  return rings
}
