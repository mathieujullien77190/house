import * as THREE from 'three'
import { ROOM } from '@/components/Kitchen3D/constants'
import { DECK, GRASS, HEDGE, LOT, PAVING } from './constants'
import { grassTufts, lawnFlowers } from './grass'
import { SITE } from './layout'
import { gardenX, gardenZ } from './plan'

/** Les places des instances d'un maillage (dans le repère du jardin). */
const placesOf = (mesh: THREE.InstancedMesh): THREE.Vector3[] => {
  const matrix = new THREE.Matrix4()
  return Array.from({ length: mesh.count }, (_, index) => {
    mesh.getMatrixAt(index, matrix)
    return new THREE.Vector3().setFromMatrixPosition(matrix)
  })
}

/** Vrai si cette place est sur de l'herbe : ni sous la maison et ses terrasses, ni sur le pavage de l'est, le chemin du portillon ou la terrasse en ipé. */
const expectOnGrass = (at: THREE.Vector3): void => {
  const { house, stepLine, stepZ, binSouth, cageZ1 } = SITE
  // La maison et sa terrasse d'1,50 m.
  expect(at.x > house[0] - 1.5 && at.x < house[1] + 1.5 && at.z > house[2] - 1.5 && at.z < house[3] + 1.5).toBe(false)
  // L'est de la maison, au nord du muret des poubelles : le pavage, la cage, la dalle.
  expect(at.z > ROOM.zMax && at.x > binSouth).toBe(false)
  // Le chemin du portillon.
  expect(at.z > gardenZ(PAVING.pathWest) && at.z < gardenZ(PAVING.pathEast) && at.x < house[0]).toBe(false)
  // La terrasse en ipé.
  expect(at.x > stepLine && at.z < stepZ && at.z > cageZ1 - 0.4 - DECK.long).toBe(false)
  // En dedans des haies.
  expect(at.z).toBeLessThan(gardenZ(HEDGE.east))
  expect(at.x).toBeLessThan(gardenX(HEDGE.north))
  expect(at.x).toBeGreaterThan(gardenX(LOT.centerY + HEDGE.radius))
}

describe('grassTufts', () => {
  const build = () => {
    const group = new THREE.Group()
    grassTufts(group)
    return group.children as THREE.InstancedMesh[]
  }

  it('un seul maillage de bouquets d’herbe : onze brins en trois tronçons, chacun teinté de son vert', () => {
    const children = build()
    expect(children).toHaveLength(1)
    const [tufts] = children
    expect(tufts.isInstancedMesh).toBe(true)
    // Dans le vent, les brins se couchent.
    expect(tufts.userData.sway).toBe(0.25)
    // 11 brins × 3 tronçons × 2 triangles.
    expect(tufts.geometry.getAttribute('position').count).toBe(11 * 3 * 6)
    expect(tufts.geometry.getAttribute('normal').count).toBe(11 * 3 * 6)
    tufts.geometry.computeBoundingBox()
    const box = tufts.geometry.boundingBox as THREE.Box3
    // Un bouquet part du sol et monte à 20 cm environ (un brin fait de 11 à 23 cm).
    expect(box.min.y).toBe(0)
    expect(box.max.y).toBeGreaterThan(0.11)
    expect(box.max.y).toBeLessThanOrEqual(0.23)
    // Sur 2600 tirages, ceux qui tombent hors de l'herbe sont écartés.
    expect(tufts.count).toBeGreaterThan(500)
    expect(tufts.count).toBeLessThan(2600)
    expect(tufts.instanceColor?.count).toBe(tufts.count)
    const tint = new THREE.Color()
    const hsl = { h: 0, s: 0, l: 0 }
    tufts.getColorAt(0, tint)
    tint.getHSL(hsl)
    expect(hsl.h).toBeGreaterThan(0.24)
    expect(hsl.h).toBeLessThan(0.32)
  })

  it('aucun bouquet hors de l’herbe ; chacun est au niveau de sa pelouse (la haute ou la basse)', () => {
    const [tufts] = build()
    const places = placesOf(tufts)
    const levels = new Set<number>()
    for (const at of places) {
      expectOnGrass(at)
      // Derrière la maison, à l'ouest de la cage, l'herbe est plus basse.
      const low = at.x > SITE.stepLine && at.z < SITE.stepZ
      expect(at.y).toBeCloseTo(low ? GRASS : -0.02)
      levels.add(Math.round(at.y * 100))
    }
    expect(levels.size).toBe(2)
  })

  it('les mêmes à chaque ouverture', () => {
    const [first] = build()
    const [second] = build()
    expect(Array.from(second.instanceMatrix.array)).toEqual(Array.from(first.instanceMatrix.array))
  })
})

describe('lawnFlowers', () => {
  const build = () => {
    const group = new THREE.Group()
    lawnFlowers(group)
    return group.children as THREE.InstancedMesh[]
  }

  it('trois maillages : les collerettes et les cœurs des pâquerettes, puis les petites fleurs de couleur', () => {
    const children = build()
    expect(children).toHaveLength(3)
    const [petals, hearts, blooms] = children
    expect(children.every((mesh) => mesh.isInstancedMesh)).toBe(true)
    // Une collerette blanche et un cœur jaune par pâquerette.
    expect(hearts.count).toBe(petals.count)
    expect(petals.count).toBeGreaterThan(200)
    expect(petals.count).toBeLessThan(1100)
    expect((petals.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xfbfbf6)
    expect((hearts.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xf2c531)
    // Les fleurs de couleur sont plus rares, chacune d'une des quatre teintes.
    expect(blooms.count).toBeGreaterThan(100)
    expect(blooms.count).toBeLessThan(500)
    expect(blooms.count).toBeLessThan(petals.count)
    const tint = new THREE.Color()
    const tints = new Set<number>()
    for (let index = 0; index < blooms.count; index += 1) {
      blooms.getColorAt(index, tint)
      tints.add(tint.getHex())
    }
    const expected = [0xf0cf3a, 0x8f6fd6, 0xe58fb4, 0x6f9be0].map((hex) => {
      // (Une couleur d'instance est gardée en flottants simple précision : on compare ce qui en ressort.)
      const stored = new Float32Array(new THREE.Color(hex).toArray())
      return new THREE.Color(stored[0], stored[1], stored[2]).getHex()
    })
    expect(tints).toEqual(new Set(expected))
  })

  it('toutes sur l’herbe : le cœur juste au-dessus de sa collerette, les fleurs de couleur un peu plus hautes', () => {
    const [petals, hearts, blooms] = build()
    const collars = placesOf(petals)
    const centers = placesOf(hearts)
    collars.forEach((at, index) => {
      expectOnGrass(at)
      expect(centers[index].x).toBeCloseTo(at.x)
      expect(centers[index].z).toBeCloseTo(at.z)
      expect(centers[index].y - at.y).toBeCloseTo(0.004)
      const ground = at.x > SITE.stepLine && at.z < SITE.stepZ ? GRASS : -0.02
      expect(at.y - ground).toBeGreaterThanOrEqual(0.035 - 1e-6)
      expect(at.y - ground).toBeLessThan(0.055 + 1e-6)
    })
    for (const at of placesOf(blooms)) {
      expectOnGrass(at)
      const ground = at.x > SITE.stepLine && at.z < SITE.stepZ ? GRASS : -0.02
      expect(at.y - ground).toBeGreaterThanOrEqual(0.06 - 1e-6)
      expect(at.y - ground).toBeLessThan(0.11 + 1e-6)
    }
  })
})
