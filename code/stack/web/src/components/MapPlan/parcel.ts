// La parcelle de la maison (section AO, numéro 0018, Dammarie-les-Lys, 598 m²) : son contour au cadastre (API Carto de l'IGN), en [longitude, latitude].
// Le plan en reprend le contour comme limite du terrain, la haie passe pile dessus, et les portails se posent sur la haie là où ils étaient.
import { PLAN_GATES } from '@/components/Lights/constants'
import { MAP_ANCHOR, MAP_CENTER, MAP_ROTATION_DEG, MAP_UNITS_PER_METER } from './constants'
import type { PlanHedge } from '@house/ui'
import { nearestOnRing, parcelPoints, ringPieces, type Point } from './ring'

export const PARCEL: [number, number][] = [
  [2.65033234, 48.52209073],
  [2.65034851, 48.52208251],
  [2.65029302, 48.52203601],
  [2.65012806, 48.52189771],
  [2.65004774, 48.5219394],
  [2.65002709, 48.52194995],
  [2.65001145, 48.5219607],
  [2.64999811, 48.52197101],
  [2.6499842, 48.52198455],
  [2.64997614, 48.52199586],
  [2.6499693, 48.52200528],
  [2.64996326, 48.5220175],
  [2.64995584, 48.52203403],
  [2.64995372, 48.52204806],
  [2.64995389, 48.52206254],
  [2.64995582, 48.5220782],
  [2.64996514, 48.52210153],
  [2.65002906, 48.52224403],
  [2.65033234, 48.52209073],
]

/** La demi-épaisseur de la haie (28 unités de trait) : les ouvertures des portails la comptent, pour que les bouts arrondis ne mordent pas dessus. */
const HEDGE_HALF = 14

const parcel = parcelPoints(PARCEL, MAP_CENTER, MAP_ANCHOR, MAP_ROTATION_DEG, MAP_UNITS_PER_METER)
// La haie suit la limite de la parcelle (son axe pile dessus).
const hedgeRing = parcel

/** La limite de propriété à l'est à la hauteur `y` du plan : le x le plus à l'est où le contour de la parcelle coupe cette ligne. */
export const eastLimitAt = (y: number): number => {
  let limit = -Infinity
  parcel.forEach(([x1, y1], index) => {
    const [x2, y2] = parcel[(index + 1) % parcel.length]
    if ((y1 <= y && y <= y2) || (y2 <= y && y <= y1)) {
      const t = y2 === y1 ? 0 : (y - y1) / (y2 - y1)
      limit = Math.max(limit, x1 + t * (x2 - x1))
    }
  })
  return limit
}

/** Les portails du plan, posés sur la haie au point le plus proche de leur ancienne place, dans le sens du côté. */
const placed = PLAN_GATES.map((gate) => {
  const length = Math.hypot(gate.x2 - gate.x1, gate.y2 - gate.y1)
  const middle: Point = [(gate.x1 + gate.x2) / 2, (gate.y1 + gate.y2) / 2]
  const { along, point, direction } = nearestOnRing(hedgeRing, middle)
  return {
    along,
    length,
    gate: {
      id: gate.id,
      name: gate.name,
      x1: point[0] - (direction[0] * length) / 2,
      y1: point[1] - (direction[1] * length) / 2,
      x2: point[0] + (direction[0] * length) / 2,
      y2: point[1] + (direction[1] * length) / 2,
    },
  }
})
export const PARCEL_GATES = placed.map((entry) => entry.gate)

/** Les haies de départ : la limite de la parcelle, percée à chaque portail (la moitié du portail, plus le bout arrondi de la haie), un morceau par haie. */
export const PARCEL_HEDGES: PlanHedge[] = ringPieces(
  hedgeRing,
  placed.map((entry) => ({ along: entry.along, half: entry.length / 2 + HEDGE_HALF })),
).map((points, index) => ({ id: `haie-${index + 1}`, points }))
