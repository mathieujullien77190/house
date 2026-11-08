// Les formes du plan, en points du plan : rectangles, ronds, champ de vision, icône de caméra, et les chemins SVG (M L H V A Z) du plan découpés en points.
import type { Point } from './projection'

const ARC_STEPS = 32
/** L'icône d'une caméra est dessinée à cette échelle (1 = le dessin d'origine, 26 unités de long). */
const CAMERA_SCALE = 1.7

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

/** Le champ de vision d'une caméra : un croissant, la portion de couronne entre `near` et `far`, de part et d'autre de sa direction. */
export const fovRing = (x: number, y: number, angle: number, fov: number, near: number, far: number, steps = 24): Point[] => {
  const from = angle - fov / 2
  const outer = Array.from({ length: steps + 1 }, (_, index) => polar(x, y, from + (fov * index) / steps, far))
  const inner = Array.from({ length: steps + 1 }, (_, index) => polar(x, y, from + fov - (fov * index) / steps, near))
  return [...outer, ...inner]
}

/** L'icône d'une caméra (un caméscope), tournée vers `angle` : le corps derrière, l'objectif qui s'évase devant. */
export const cameraRing = (x: number, y: number, angle: number): Point[] => {
  const radians = (angle * Math.PI) / 180
  const forward: Point = [Math.sin(radians), -Math.cos(radians)]
  const right: Point = [Math.cos(radians), Math.sin(radians)]
  // (devant, côté) en unités du plan.
  const local: Point[] = [
    [-9, -6],
    [5, -6],
    [5, -3],
    [12, -8],
    [12, 8],
    [5, 3],
    [5, 6],
    [-9, 6],
  ]
  return local.map(([f, s]): Point => [
    x + CAMERA_SCALE * (f * forward[0] + s * right[0]),
    y + CAMERA_SCALE * (f * forward[1] + s * right[1]),
  ])
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
