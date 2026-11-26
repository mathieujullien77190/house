import type * as THREE from 'three'
import { HOUSE_SHIFT, PLAN_CAGE, UNITS_PER_METER } from '@/components/Lights/constants'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { BASE, OUTER_WALL, REST, ROOM, SAS } from './constants'
import { buildGarden, gardenX, gardenZ, terracottaTexture } from './garden'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

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

describe('terracottaTexture', () => {
  it('le joint, puis seize cases de deux carreaux, couchés ou debout en alternance', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    expect((terracottaTexture().image as HTMLCanvasElement).width).toBe(512)
    const calls = context.fillRect.mock.calls as [number, number, number, number][]
    expect(calls).toHaveLength(33)
    expect(calls[0]).toEqual([0, 0, 512, 512])
    // La première case : deux carreaux couchés l'un sur l'autre ; la suivante : deux debout côte à côte.
    expect(calls.slice(1, 5)).toEqual([
      [2, 2, 124, 60],
      [2, 66, 124, 60],
      [130, 2, 60, 124],
      [194, 2, 60, 124],
    ])
  })
})

describe('buildGarden', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('le terrain est plus bas que le sol de la maison ; la pelouse d’abord, puis la terrasse trouée de la maison', () => {
    const garden = buildGarden()
    expect(garden.position.y).toBe(-BASE.rise)
    const [lawn, terrace] = garden.children as THREE.Mesh[]
    expect(lawn.geometry.type).toBe('ShapeGeometry')
    expect(lawn.rotation.x).toBeCloseTo(-Math.PI / 2)
    expect(lawn.position.y).toBe(-0.02)
    lawn.geometry.computeBoundingBox()
    // La pelouse dépasse largement la maison de tous les côtés.
    const box = lawn.geometry.boundingBox as THREE.Box3
    expect(box.min.x).toBeLessThan(ROOM.xMin - 10)
    expect(box.max.x).toBeGreaterThan(ROOM.xMax + 5)
    const shape = (terrace.geometry as THREE.ShapeGeometry).parameters.shapes as THREE.Shape
    expect(shape.holes).toHaveLength(1)
    const hole = shape.holes[0].getPoints()
    expect(Math.min(...hole.map((point) => point.x))).toBeCloseTo(ROOM.xMin - OUTER_WALL)
    expect(Math.max(...hole.map((point) => point.x))).toBeCloseTo(ROOM.xMax + OUTER_WALL)
  })

  it('la cage à perruches à sa place sur le plan : six poteaux, du grillage sur quatre côtés et le dessus', () => {
    const meshes = meshesOf(buildGarden())
    const netting = meshes.filter((mesh) => (mesh.material as THREE.MeshStandardMaterial).opacity === 0.22)
    expect(netting).toHaveLength(5)
    const posts = meshes.filter((mesh) => {
      const { width, depth } = (mesh.geometry as THREE.BoxGeometry).parameters
      return mesh.geometry.type === 'BoxGeometry' && width === 0.08 && depth === 0.08
    })
    expect(posts).toHaveLength(6)
    // Son coin nord-ouest est celui du plan ; elle fait 3,40 m sur 5,10 m.
    expect(Math.max(...posts.map((post) => post.position.x))).toBeCloseTo(gardenX(PLAN_CAGE.y))
    expect(Math.min(...posts.map((post) => post.position.z))).toBeCloseTo(gardenZ(PLAN_CAGE.x))
    expect(Math.max(...posts.map((post) => post.position.z)) - Math.min(...posts.map((post) => post.position.z))).toBeCloseTo(3.4)
    expect(Math.max(...posts.map((post) => post.position.x)) - Math.min(...posts.map((post) => post.position.x))).toBeCloseTo(5.1)
  })

  it('quatre poubelles à deux roues, la table de jardin et ses quatre chaises, la pompe à chaleur contre le sas', () => {
    const garden = buildGarden()
    const meshes = meshesOf(garden)
    const wheels = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && (mesh.geometry as THREE.CylinderGeometry).parameters.radiusTop === 0.09)
    expect(wheels).toHaveLength(8)
    // Deux poubelles grises partagent leur matériau ; la verte a le sien.
    const bodies = meshes.filter((mesh) => {
      const { width, height, depth } = (mesh.geometry as THREE.BoxGeometry).parameters
      return width === 0.56 && height === 0.9 && depth === 0.5
    })
    expect(bodies).toHaveLength(4)
    expect(new Set(bodies.map((body) => body.material)).size).toBe(2)
    const chairs = garden.children.filter((child) => child.type === 'Group')
    expect(chairs).toHaveLength(4)
    expect(chairs.map((chair) => chair.rotation.y)).toEqual([0, Math.PI, Math.PI / 2, -Math.PI / 2])
    const grille = meshes.at(-1) as THREE.Mesh
    expect(grille.position.x).toBeCloseTo(SAS.north + OUTER_WALL + 0.65)
    expect(grille.position.z).toBeGreaterThan(ROOM.zMax + OUTER_WALL)
  })

  it('la haie fait 1,50 m de haut ; la plante grimpante est la même à chaque ouverture', () => {
    const hedgeOf = (meshes: THREE.Mesh[]) =>
      meshes.filter((mesh) => {
        const { width, height } = (mesh.geometry as THREE.BoxGeometry).parameters
        return width === 0.5 && height === 1.5
      })
    const first = meshesOf(buildGarden())
    expect(hedgeOf(first).length).toBeGreaterThan(20)
    for (const piece of hedgeOf(first)) expect(piece.position.y).toBe(0.75)
    const leaves = (meshes: THREE.Mesh[]) => meshes.filter((mesh) => mesh.geometry.type === 'SphereGeometry').map((mesh) => mesh.position.toArray())
    expect(leaves(first)).toHaveLength(16)
    expect(leaves(meshesOf(buildGarden()))).toEqual(leaves(first))
  })
})
