import * as THREE from 'three'
import { UNITS_PER_METER } from '@/components/Lights/constants'
import { REST, ROOM } from '@/components/Kitchen3D/constants'
import { box } from '@/components/Kitchen3D/primitives'
import { LOT, PLAN } from './constants'
import type { PlanPoint } from './constants'

/**
 * D'une abscisse du plan à la place d'ouest en est dans la scène (z). Sous la maison, le plan est ramené aux murs de la scène (elle y est
 * un peu moins large que sur le plan) ; dehors, il est à l'échelle, compté depuis le mur le plus proche.
 */
export const gardenZ = (planX: number): number => {
  const east = PLAN.west + PLAN.width
  if (planX < PLAN.west) return REST.west - (PLAN.west - planX) / UNITS_PER_METER
  if (planX > east) return ROOM.zMax + (planX - east) / UNITS_PER_METER
  return REST.west + ((planX - PLAN.west) / PLAN.width) * (ROOM.zMax - REST.west)
}

/** D'une ordonnée du plan à la place du nord au sud dans la scène (x, qui croît vers le nord) : même principe que `gardenZ`. */
export const gardenX = (planY: number): number => {
  if (planY < 0) return ROOM.xMax - planY / UNITS_PER_METER
  if (planY > PLAN.height) return ROOM.xMin - (planY - PLAN.height) / UNITS_PER_METER
  return ROOM.xMax - (planY / PLAN.height) * (ROOM.xMax - ROOM.xMin)
}

/** De la place dans la scène (x, z) à celle du plan (l'inverse de `gardenX` et `gardenZ`). */
export const planOf = (x: number, z: number): PlanPoint => {
  const east = PLAN.west + PLAN.width
  const planX = z > ROOM.zMax ? east + (z - ROOM.zMax) * UNITS_PER_METER : z < REST.west ? PLAN.west - (REST.west - z) * UNITS_PER_METER : PLAN.west + ((z - REST.west) / (ROOM.zMax - REST.west)) * PLAN.width
  const planY = x > ROOM.xMax ? -(x - ROOM.xMax) * UNITS_PER_METER : x < ROOM.xMin ? PLAN.height + (ROOM.xMin - x) * UNITS_PER_METER : ((ROOM.xMax - x) / (ROOM.xMax - ROOM.xMin)) * PLAN.height
  return [planX, planY]
}

/** Vrai si la place de la scène est dans la propriété : sous l'arc de la limite côté rue, dans la bande du haut au nord, en deçà de la limite de l'est. */
export const inLot = (x: number, z: number): boolean => {
  const [planX, planY] = planOf(x, z)
  if (planX > LOT.east || planY < LOT.north) return false
  return planY <= LOT.centerY ? planX >= LOT.centerX - LOT.radius : Math.hypot(planX - LOT.centerX, planY - LOT.centerY) <= LOT.radius
}

/** Les points d'un arc du plan, centré sur le centre du terrain, d'un point à l'autre (ses deux bouts compris), un tous les 60 unités environ. */
export const arc = (radius: number, from: PlanPoint, to: PlanPoint): PlanPoint[] => {
  const angle = ([x, y]: PlanPoint) => Math.atan2(y - LOT.centerY, x - LOT.centerX)
  const start = angle(from)
  const end = angle(to)
  const steps = Math.max(1, Math.ceil((Math.abs(end - start) * radius) / 60))
  return Array.from({ length: steps + 1 }, (_, index) => {
    const turn = start + ((end - start) * index) / steps
    return [LOT.centerX + radius * Math.cos(turn), LOT.centerY + radius * Math.sin(turn)]
  })
}

/** Une surface à plat sur le sol, donnée par son contour sur le plan. */
export const flat = (points: PlanPoint[], material: THREE.Material, y: number, holes: PlanPoint[][] = []): THREE.Mesh => {
  // Dans le repère de la forme : (x de la scène, −z de la scène) ; couchée d'un quart de tour, elle retombe à sa place.
  const shape = new THREE.Shape(points.map(([planX, planY]) => new THREE.Vector2(gardenX(planY), -gardenZ(planX))))
  // Des trous dans la surface (un chemin en contrebas, par exemple).
  shape.holes = holes.map((hole) => new THREE.Path(hole.map(([planX, planY]) => new THREE.Vector2(gardenX(planY), -gardenZ(planX)))))
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = y
  return mesh
}

/** Un quadrilatère dans l'espace (quatre points de la scène, dans l'ordre du tour), vu des deux côtés : une rampe, la face d'un mur de soutènement. */
export const quad = (corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3], material: THREE.Material): THREE.Mesh => {
  const [a, b, c, d] = corners
  const geometry = new THREE.BufferGeometry().setFromPoints([a, b, c, a, c, d])
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material)
}

/** Un pavé couché le long d'une ligne du plan (une haie, un portail) : un tronçon par segment. */
export const along = (points: PlanPoint[], material: THREE.Material, height: number, thickness: number): THREE.Mesh[] =>
  points.slice(1).map((point, index) => {
    const [fromX, fromZ] = [gardenX(points[index][1]), gardenZ(points[index][0])]
    const [toX, toZ] = [gardenX(point[1]), gardenZ(point[0])]
    const piece = box(thickness, height, Math.hypot(toX - fromX, toZ - fromZ) + thickness / 2, material, (fromX + toX) / 2, height / 2, (fromZ + toZ) / 2)
    piece.rotation.y = Math.atan2(toX - fromX, toZ - fromZ)
    return piece
  })

/** Pose sur `group` des surfaces à plat de ce matériau, données en mètres de la scène (le motif de terre cuite s'y répète tout seul). */
export const tiledOn = (group: THREE.Group, material: THREE.Material) => (x1: number, x2: number, z1: number, z2: number, y: number): void => {
  const shape = new THREE.Shape([new THREE.Vector2(x1, -z1), new THREE.Vector2(x2, -z1), new THREE.Vector2(x2, -z2), new THREE.Vector2(x1, -z2)])
  const surface = new THREE.Mesh(new THREE.ShapeGeometry(shape), material)
  surface.rotation.x = -Math.PI / 2
  surface.position.y = y
  group.add(surface)
}
