// Le plan se garde en vraies coordonnées : les positions en longitude et latitude, les tailles en mètres, les angles en caps (degrés depuis le nord, sens horaire). Il se dessine en
// unités du plan (43,5 par mètre, le haut du dessin vers le nord tourné de MAP_ROTATION_DEG) : ce fichier fait le passage dans les deux sens, à la lecture et à l'envoi.
// Un plan enregistré avant (version 1) est en unités du dessin : il est converti à la lecture et renvoyé en version 2 au premier changement.
import { MAP_ROTATION_DEG, MAP_UNITS_PER_METER } from '@/components/MapPlan/constants'
import { lngLatToPlan, planToLngLat } from '@/components/MapPlan/projection'
import type { PlanDocument } from '@/lib/api'

export const STORED_VERSION = 2

const meters = (units: number): number => Math.round((units / MAP_UNITS_PER_METER) * 1000) / 1000
const units = (metersValue: number): number => metersValue * MAP_UNITS_PER_METER
const bearing = (angle: number): number => (((angle + MAP_ROTATION_DEG) % 360) + 360) % 360
const angleOf = (cap: number): number => (((cap - MAP_ROTATION_DEG) % 360) + 360) % 360
const point = ([lng, lat]: [number, number]): { x: number; y: number } => ({ x: lng, y: lat })

/** Le plan en unités du dessin (ce que la carte dessine) d'après le document enregistré, quelle que soit sa version. */
export const fromStored = (stored: PlanDocument): PlanDocument => {
  if (stored.version !== STORED_VERSION) return stored
  const place = ({ x, y }: { x: number; y: number }) => {
    const [px, py] = lngLatToPlan(x, y)
    return { x: px, y: py }
  }
  return {
    version: STORED_VERSION,
    trees: stored.trees.map((tree) => ({ ...tree, ...place(tree), r: units(tree.r) })),
    hedges: stored.hedges.map((hedge) => ({ ...hedge, points: hedge.points.map(([lng, lat]) => lngLatToPlan(lng, lat)) })),
    cage: stored.cage ? place(stored.cage) : null,
    offsets: Object.fromEntries(Object.entries(stored.offsets).map(([id, offset]) => [id, { dx: units(offset.dx), dy: units(offset.dy) }])),
    items: Object.fromEntries(Object.entries(stored.items).map(([id, item]) => [id, place(item)])),
    cameras: stored.cameras.map((camera) => ({
      ...camera,
      ...place(camera),
      angle: angleOf(camera.angle),
      near: units(camera.near),
      far: units(camera.far),
    })),
    links: stored.links,
  }
}

/** Le document à enregistrer d'après le plan en unités : positions en longitude et latitude, tailles en mètres, angles en caps. */
export const toStored = (plan: PlanDocument): PlanDocument => {
  const place = ({ x, y }: { x: number; y: number }) => point(planToLngLat(x, y))
  return {
    version: STORED_VERSION,
    trees: plan.trees.map((tree) => ({ ...tree, ...place(tree), r: meters(tree.r) })),
    hedges: plan.hedges.map((hedge) => ({ ...hedge, points: hedge.points.map(([x, y]) => planToLngLat(x, y)) })),
    cage: plan.cage ? place(plan.cage) : null,
    offsets: Object.fromEntries(Object.entries(plan.offsets).map(([id, offset]) => [id, { dx: meters(offset.dx), dy: meters(offset.dy) }])),
    items: Object.fromEntries(Object.entries(plan.items).map(([id, item]) => [id, place(item)])),
    cameras: plan.cameras.map((camera) => ({
      ...camera,
      ...place(camera),
      angle: Math.round(bearing(camera.angle) * 100) / 100,
      near: meters(camera.near),
      far: meters(camera.far),
    })),
    links: plan.links,
  }
}
