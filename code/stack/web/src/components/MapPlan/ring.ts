// Géométrie d'un contour fermé (la limite de la parcelle) dans les unités du plan : point le plus proche, tracé percé d'ouvertures.
import { METERS_PER_DEGREE } from './helpers'

export type Point = [number, number]

/**
 * Le contour d'une parcelle (liste [longitude, latitude]) en points dans les unités du plan. Le plan est posé sur la carte avec son point `anchor` sur `center` et tourné
 * de `rotation` degrés (sens horaire) : on fait le chemin inverse (déplacement en mètres, puis rotation inverse, puis unités du plan). Le point de fermeture répété est retiré.
 */
export const parcelPoints = (
  ring: [number, number][],
  center: [number, number],
  anchor: { x: number; y: number },
  rotation: number,
  unitsPerMeter: number,
): Point[] => {
  const angle = (rotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const metersPerDegreeLng = METERS_PER_DEGREE * Math.cos((center[0] * Math.PI) / 180)
  const points = ring.map(([lng, lat]): Point => {
    const east = (lng - center[1]) * metersPerDegreeLng
    const south = -(lat - center[0]) * METERS_PER_DEGREE
    return [anchor.x + (east * cos + south * sin) * unitsPerMeter, anchor.y + (-east * sin + south * cos) * unitsPerMeter]
  })
  const first = points[0]
  const last = points[points.length - 1]
  return first && last && first[0] === last[0] && first[1] === last[1] ? points.slice(0, -1) : points
}

const unit = (dx: number, dy: number): Point => {
  const length = Math.hypot(dx, dy) || 1
  return [dx / length, dy / length]
}

const at = (points: Point[], index: number): Point => points[((index % points.length) + points.length) % points.length] ?? [0, 0]

/** Le point du contour fermé le plus proche de `target` : sa position le long du contour (`along`), le point et la direction du côté. */
export const nearestOnRing = (points: Point[], target: Point): { along: number; point: Point; direction: Point } => {
  let best = { along: 0, point: at(points, 0), direction: [1, 0] as Point, gap: Infinity }
  let walked = 0
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = at(points, index)
    const [x2, y2] = at(points, index + 1)
    const length = Math.hypot(x2 - x1, y2 - y1)
    const t = length === 0 ? 0 : Math.min(1, Math.max(0, ((target[0] - x1) * (x2 - x1) + (target[1] - y1) * (y2 - y1)) / length ** 2))
    const point: Point = [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
    const gap = Math.hypot(target[0] - point[0], target[1] - point[1])
    if (gap < best.gap) best = { along: walked + t * length, point, direction: unit(x2 - x1, y2 - y1), gap }
    walked += length
  }
  return { along: best.along, point: best.point, direction: best.direction }
}

/**
 * Un contour fermé coupé aux endroits donnés (position le long du contour et demi-largeur de l'ouverture) : les morceaux qui restent, chacun une
 * suite de points (une haie percée par les portails).
 */
export const ringPieces = (points: Point[], gaps: { along: number; half: number }[]): Point[][] => {
  const perimeter = points.reduce((sum, p, index) => sum + Math.hypot(at(points, index + 1)[0] - p[0], at(points, index + 1)[1] - p[1]), 0)
  const shifts = [-perimeter, 0, perimeter]
  const inGap = (along: number) => gaps.some(({ along: center, half }) => shifts.some((shift) => Math.abs(along - (center + shift)) < half))
  const pieces: Point[][] = []
  let piece: Point[] = []
  let walked = 0
  for (let index = 0; index < points.length; index += 1) {
    const start = at(points, index)
    const end = at(points, index + 1)
    const length = Math.hypot(end[0] - start[0], end[1] - start[1])
    // Les coupures de cette arête : les bords des ouvertures qui la traversent.
    const cuts = [0, 1]
    for (const { along: center, half } of gaps) {
      for (const shift of shifts) {
        for (const edge of [center + shift - half, center + shift + half]) {
          const t = (edge - walked) / (length || 1)
          if (t > 0 && t < 1) cuts.push(t)
        }
      }
    }
    cuts.sort((a, b) => a - b)
    for (let k = 0; k < cuts.length - 1; k += 1) {
      const a = cuts[k]
      const b = cuts[k + 1]
      if (b - a < 1e-9) continue
      if (inGap(walked + ((a + b) / 2) * length)) {
        if (piece.length > 1) pieces.push(piece)
        piece = []
        continue
      }
      const from: Point = [Math.round(start[0] + a * (end[0] - start[0])), Math.round(start[1] + a * (end[1] - start[1]))]
      const to: Point = [Math.round(start[0] + b * (end[0] - start[0])), Math.round(start[1] + b * (end[1] - start[1]))]
      const last = piece[piece.length - 1]
      if (!last || Math.hypot(last[0] - from[0], last[1] - from[1]) > 0.5) piece.push(from)
      piece.push(to)
    }
    walked += length
  }
  if (piece.length > 1) pieces.push(piece)
  // Le contour se referme sur lui-même : le dernier morceau et le premier n'en font qu'un s'ils se touchent.
  const first = pieces[0]
  const last = pieces[pieces.length - 1]
  if (pieces.length > 1 && first && last) {
    const a = first[0]
    const b = last[last.length - 1]
    if (a && b && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5) {
      pieces.splice(0, 1, [...last.slice(0, -1), ...first])
      pieces.pop()
    }
  }
  return pieces
}
