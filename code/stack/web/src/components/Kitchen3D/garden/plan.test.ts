import * as THREE from 'three'
import { HOUSE_SHIFT, UNITS_PER_METER } from '@/components/Lights/constants'
import { REST, ROOM } from '@/components/Kitchen3D/constants'
import { LOT } from './constants'
import type { PlanPoint } from './constants'
import { along, arc, flat, gardenX, gardenZ, inLot, planOf, quad, tiledOn } from './plan'

describe('gardenZ, gardenX', () => {
  it('sous la maison, le plan est ramené aux murs de la scène', () => {
    expect(gardenZ(HOUSE_SHIFT)).toBeCloseTo(REST.west)
    expect(gardenZ(HOUSE_SHIFT + 540)).toBeCloseTo(ROOM.zMax)
    expect(gardenZ(HOUSE_SHIFT + 270)).toBeCloseTo((REST.west + ROOM.zMax) / 2)
    expect(gardenX(0)).toBeCloseTo(ROOM.xMax)
    expect(gardenX(300)).toBeCloseTo(ROOM.xMin)
    expect(gardenX(150)).toBeCloseTo((ROOM.xMin + ROOM.xMax) / 2)
  })

  it('dehors, il est à l’échelle (39 unités le mètre), compté depuis le mur le plus proche', () => {
    expect(gardenZ(HOUSE_SHIFT - UNITS_PER_METER)).toBeCloseTo(REST.west - 1)
    expect(gardenZ(HOUSE_SHIFT + 540 + 2 * UNITS_PER_METER)).toBeCloseTo(ROOM.zMax + 2)
    expect(gardenX(-3 * UNITS_PER_METER)).toBeCloseTo(ROOM.xMax + 3)
    expect(gardenX(300 + UNITS_PER_METER)).toBeCloseTo(ROOM.xMin - 1)
  })
})

describe('arc', () => {
  it('va d’un point à l’autre, bouts compris, sur le cercle du terrain, un point tous les 60 unités environ', () => {
    const from: PlanPoint = [LOT.centerX - 1000, LOT.centerY]
    const to: PlanPoint = [LOT.centerX, LOT.centerY + 1000]
    const points = arc(1000, from, to)
    // Un quart de tour de 1000 unités de rayon : 1571 unités, soit 27 pas.
    expect(points).toHaveLength(28)
    expect(points[0][0]).toBeCloseTo(from[0])
    expect(points[0][1]).toBeCloseTo(from[1])
    expect(points[27][0]).toBeCloseTo(to[0])
    expect(points[27][1]).toBeCloseTo(to[1])
    for (const [x, y] of points) expect(Math.hypot(x - LOT.centerX, y - LOT.centerY)).toBeCloseTo(1000)
  })

  it('entre deux points confondus, il garde un pas : ses deux bouts', () => {
    const point: PlanPoint = [LOT.centerX, LOT.centerY + 500]
    const points = arc(500, point, point)
    expect(points).toHaveLength(2)
    expect(points[0]).toEqual(points[1])
  })
})

describe('flat', () => {
  it('une surface couchée à la hauteur donnée, dont le contour est celui du plan', () => {
    const material = new THREE.MeshStandardMaterial()
    const mesh = flat([[HOUSE_SHIFT, 0], [HOUSE_SHIFT + 540, 0], [HOUSE_SHIFT + 540, 300], [HOUSE_SHIFT, 300]], material, -0.02)
    expect(mesh.geometry.type).toBe('ShapeGeometry')
    expect(mesh.material).toBe(material)
    expect(mesh.rotation.x).toBeCloseTo(-Math.PI / 2)
    expect(mesh.position.y).toBe(-0.02)
    // Une fois couchée, elle couvre l'emprise de la maison (dans la scène).
    const box = new THREE.Box3().setFromObject(mesh)
    expect(box.min.x).toBeCloseTo(ROOM.xMin)
    expect(box.max.x).toBeCloseTo(ROOM.xMax)
    expect(box.min.z).toBeCloseTo(REST.west)
    expect(box.max.z).toBeCloseTo(ROOM.zMax)
  })
})

describe('flat avec des trous', () => {
  it('chaque trou du plan est percé dans la surface', () => {
    const outline: PlanPoint[] = [[HOUSE_SHIFT, 0], [HOUSE_SHIFT + 540, 0], [HOUSE_SHIFT + 540, 300], [HOUSE_SHIFT, 300]]
    const hole: PlanPoint[] = [[HOUSE_SHIFT + 100, 100], [HOUSE_SHIFT + 200, 100], [HOUSE_SHIFT + 200, 200], [HOUSE_SHIFT + 100, 200]]
    const material = new THREE.MeshStandardMaterial()
    const full = flat(outline, material, 0)
    const holed = flat(outline, material, 0, [hole])
    // Le trou ajoute des sommets et des triangles, et l'emprise ne change pas.
    expect(holed.geometry.attributes.position.count).toBeGreaterThan(full.geometry.attributes.position.count)
    expect(new THREE.Box3().setFromObject(holed).equals(new THREE.Box3().setFromObject(full))).toBe(true)
  })
})

describe('quad', () => {
  it('deux triangles à la suite, avec leurs normales, dans le matériau donné', () => {
    const material = new THREE.MeshStandardMaterial()
    const corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 0), new THREE.Vector3(0, 1, 0)]
    const mesh = quad(corners, material)
    expect(mesh.material).toBe(material)
    expect(mesh.geometry.attributes.position.count).toBe(6)
    expect(mesh.geometry.attributes.normal.count).toBe(6)
    expect(new THREE.Box3().setFromObject(mesh).max.toArray()).toEqual([1, 1, 0])
  })
})

describe('planOf, inLot', () => {
  it('planOf est l’inverse de gardenX et gardenZ, sous la maison comme dehors', () => {
    for (const [planX, planY] of [[HOUSE_SHIFT + 100, 100], [HOUSE_SHIFT - 80, -50], [HOUSE_SHIFT + 540 + 90, 350]] as PlanPoint[]) {
      const [backX, backY] = planOf(gardenX(planY), gardenZ(planX))
      expect(backX).toBeCloseTo(planX)
      expect(backY).toBeCloseTo(planY)
    }
  })

  it('la propriété : sous l’arc côté rue, dans la bande du haut, en deçà de la limite de l’est', () => {
    const at = ([planX, planY]: PlanPoint) => inLot(gardenX(planY), gardenZ(planX))
    expect(at([HOUSE_SHIFT + 100, 100])).toBe(true)
    // Dans la bande du nord (au-dessus du centre de l'arc), puis au-delà de la limite du nord.
    expect(at([0, LOT.north + 10])).toBe(true)
    expect(at([0, LOT.north - 10])).toBe(false)
    // Au-delà de la limite est.
    expect(at([LOT.east + 10, 0])).toBe(false)
    // Dans la bande, à l'ouest de l'arc : dehors.
    expect(at([LOT.centerX - LOT.radius - 10, LOT.centerY - 10])).toBe(false)
    // Au sud du centre : le cercle décide.
    expect(at([LOT.centerX, LOT.centerY + LOT.radius - 10])).toBe(true)
    expect(at([LOT.centerX, LOT.centerY + LOT.radius + 10])).toBe(false)
  })
})

describe('along', () => {
  it('un tronçon par segment, posé sur le sol, tourné le long de sa ligne', () => {
    const material = new THREE.MeshStandardMaterial()
    // Deux segments à l'est de la maison : l'un vers le sud (le long de x), l'autre vers l'est (le long de z).
    const east = HOUSE_SHIFT + 540
    const pieces = along([[east + 39, 0], [east + 39, 150], [east + 78, 150]], material, 1.5, 0.5)
    expect(pieces).toHaveLength(2)
    const [south, eastward] = pieces
    const half = (ROOM.xMax - ROOM.xMin) / 2
    const first = (south.geometry as THREE.BoxGeometry).parameters
    expect(first.width).toBe(0.5)
    expect(first.height).toBe(1.5)
    // Il déborde d'un quart de son épaisseur à chaque bout.
    expect(first.depth).toBeCloseTo(half + 0.25)
    expect(south.position.x).toBeCloseTo(ROOM.xMax - half / 2)
    expect(south.position.y).toBe(0.75)
    expect(south.position.z).toBeCloseTo(ROOM.zMax + 1)
    expect(Math.abs(south.rotation.y)).toBeCloseTo(Math.PI / 2)
    expect((eastward.geometry as THREE.BoxGeometry).parameters.depth).toBeCloseTo(1.25)
    expect(eastward.rotation.y).toBeCloseTo(0)
    expect(eastward.position.z).toBeCloseTo(ROOM.zMax + 1.5)
    expect(eastward.material).toBe(material)
  })

  it('un seul point ne fait aucun tronçon', () => {
    expect(along([[0, 0]], new THREE.MeshStandardMaterial(), 1, 0.2)).toEqual([])
  })
})

describe('tiledOn', () => {
  it('pose sur le groupe une surface couchée, de ce matériau, entre ces bords', () => {
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial()
    tiledOn(group, material)(-2, 1, 3, 5, 0.29)
    expect(group.children).toHaveLength(1)
    const surface = group.children[0] as THREE.Mesh
    expect(surface.material).toBe(material)
    expect(surface.position.y).toBe(0.29)
    const box = new THREE.Box3().setFromObject(surface)
    expect(box.min.x).toBeCloseTo(-2)
    expect(box.max.x).toBeCloseTo(1)
    expect(box.min.z).toBeCloseTo(3)
    expect(box.max.z).toBeCloseTo(5)
    expect(box.min.y).toBeCloseTo(0.29)
    expect(box.max.y).toBeCloseTo(0.29)
  })
})
