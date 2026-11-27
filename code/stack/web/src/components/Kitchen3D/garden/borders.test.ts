import * as THREE from 'three'
import { UNITS_PER_METER } from '@/components/Lights/constants'
import { stubCanvasContext } from '@/test/canvas'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { binWalls, hedges, pathAndGates } from './borders'
import { GATE_HEIGHT, HEDGE, LOT, LOW, PAVING } from './constants'
import { SITE } from './layout'
import { gardenX, gardenZ } from './plan'

const built = (build: (group: THREE.Group, m: ReturnType<typeof gardenMaterials>) => void) => {
  const group = new THREE.Group()
  const m = gardenMaterials()
  build(group, m)
  return { children: group.children, m }
}

const sizeOf = (object: THREE.Object3D) => ((object as THREE.Mesh).geometry as THREE.BoxGeometry).parameters

beforeEach(() => {
  stubCanvasContext(null)
})

describe('hedges', () => {
  it('l’arc en trois haies de spirées, la haie taillée du nord, les spirées de l’ouest, les thuyas de l’est puis encore des spirées', () => {
    const { children, m } = built(hedges)
    expect(children.map((child) => child.type)).toEqual(['Group', 'Group', 'Group', 'Mesh', 'Group', 'Mesh', 'Group'])
    // La haie taillée du nord : d'un seul tenant, elle descend jusqu'au sol de la partie basse.
    const north = children[3] as THREE.Mesh
    expect(north.material).toBe(m.hedge)
    expect(sizeOf(north).width).toBe(HEDGE.thickness)
    expect(sizeOf(north).height).toBeCloseTo(HEDGE.height + LOW)
    expect(north.position.y + sizeOf(north).height / 2).toBeCloseTo(HEDGE.height)
    expect(north.position.x).toBeCloseTo(gardenX(HEDGE.north))
    // Les thuyas : 2,50 m de haut, 85 cm d'épaisseur, sur la limite est, du ras de la cage jusqu'au muret des poubelles.
    const thuja = children[5] as THREE.Mesh
    expect(sizeOf(thuja).height).toBe(2.5)
    expect(sizeOf(thuja).width).toBe(HEDGE.eastThickness)
    expect(thuja.position.z).toBeCloseTo(gardenZ(HEDGE.east))
    const box = new THREE.Box3().setFromObject(thuja)
    expect(box.max.x).toBeLessThan(SITE.cageX1)
    expect(box.max.x).toBeGreaterThan(SITE.cageX1 - 0.1)
    // (Un tronçon déborde d'un quart de son épaisseur à chaque bout.)
    expect(box.min.x).toBeCloseTo(SITE.binSouth - 0.15 - HEDGE.eastThickness / 4)
  })

  it('les spirées de l’arc qui bordent la partie basse (le premier morceau, le bord ouest) ont le pied 20 cm plus bas', () => {
    const { children } = built(hedges)
    const bodyOf = (hedge: THREE.Object3D) => hedge.children[0] as THREE.Mesh
    const footOf = (hedge: THREE.Object3D) => bodyOf(hedge).position.y - sizeOf(bodyOf(hedge)).height / 2
    expect(footOf(children[0])).toBeCloseTo(-LOW)
    expect(footOf(children[1])).toBeCloseTo(0)
    expect(footOf(children[2])).toBeCloseTo(0)
    expect(footOf(children[4])).toBeCloseTo(-LOW)
    expect(footOf(children[6])).toBeCloseTo(0)
    // Chaque haie : un bloc par tronçon, puis ses feuilles et ses fleurs (deux maillages).
    for (const index of [0, 1, 2, 4, 6]) {
      const parts = children[index].children
      expect(parts.slice(-2).every((part) => (part as THREE.InstancedMesh).isInstancedMesh)).toBe(true)
      expect(parts.slice(0, -2).every((part) => part.type === 'Mesh')).toBe(true)
    }
    // Les deux haies droites n'ont qu'un tronçon.
    expect(children[4].children).toHaveLength(3)
    expect(children[6].children).toHaveLength(3)
    // La dernière finit au bas de l'arc.
    expect(new THREE.Box3().setFromObject(bodyOf(children[6])).min.x).toBeCloseTo(gardenX(LOT.centerY + HEDGE.radius) - 0.15, 1)
  })
})

describe('pathAndGates', () => {
  it('les murets du chemin du portillon et sa jardinière, les deux piliers, le portail et le portillon', () => {
    const { children, m } = built(pathAndGates)
    expect(children).toHaveLength(8)
    const meshes = children as THREE.Mesh[]
    const [west, east, outer, earth, pillarOne, pillarTwo, gate, wicket] = meshes
    // Trois murets de la hauteur des carreaux surélevés, épais de 15 cm.
    for (const muret of [west, east, outer]) {
      expect(muret.material).toBe(m.wall)
      expect(sizeOf(muret).height).toBeCloseTo(SITE.raised)
      expect(sizeOf(muret).width).toBe(0.15)
    }
    expect(west.position.z).toBeCloseTo(gardenZ(PAVING.pathWest))
    expect(east.position.z).toBeCloseTo(gardenZ(PAVING.pathEast))
    // Le second muret de l'ouest double le premier à 30 cm (plus son épaisseur) ; la terre est entre les deux, un peu plus basse.
    expect(outer.position.z).toBeCloseTo(gardenZ(PAVING.pathWest - 0.45 * UNITS_PER_METER))
    expect(outer.position.z).toBeLessThan(west.position.z)
    expect(earth.position.z).toBeCloseTo((west.position.z + outer.position.z) / 2)
    expect(sizeOf(earth).height).toBeCloseTo(SITE.raised - 0.04)
    expect(sizeOf(earth).width).toBeCloseTo(0.28)
    // Les piliers de pierre claire, aux deux bouts du portillon.
    expect(pillarOne.material).toBe(pillarTwo.material)
    expect(sizeOf(pillarOne)).toMatchObject({ width: 0.3, height: 1.6, depth: 0.3 })
    expect(pillarOne.position.toArray()).toEqual([gardenX(SITE.wicket.y1), 0.8, gardenZ(SITE.wicket.x1)])
    expect(pillarTwo.position.toArray()).toEqual([gardenX(SITE.wicket.y2), 0.8, gardenZ(SITE.wicket.x2)])
    // Le portail et le portillon, en fer sombre, de 1,40 m.
    for (const door of [gate, wicket]) {
      expect(door.material).toBe(m.iron)
      expect(sizeOf(door).height).toBe(GATE_HEIGHT)
      expect(sizeOf(door).width).toBe(0.06)
    }
    expect(sizeOf(gate).depth).toBeGreaterThan(sizeOf(wicket).depth)
    expect(wicket.position.z).toBeCloseTo((pillarOne.position.z + pillarTwo.position.z) / 2)
  })
})

describe('binWalls', () => {
  it('le carrelage sous les poubelles, et devant elles le muret qui va du chemin du portillon à la haie', () => {
    const { children, m } = built(binWalls)
    expect(children).toHaveLength(2)
    const [tiles, muret] = children as THREE.Mesh[]
    expect(tiles.material).toBe(m.terrace)
    expect(tiles.position.y).toBe(-0.007)
    const tiled = new THREE.Box3().setFromObject(tiles)
    expect(tiled.min.x).toBeCloseTo(SITE.binSouth)
    expect(tiled.max.x).toBeCloseTo(gardenX(PAVING.south))
    expect(tiled.min.z).toBeCloseTo(SITE.binWest)
    expect(muret.material).toBe(m.wall)
    expect(sizeOf(muret).height).toBeCloseTo(SITE.raised)
    expect(muret.position.x).toBeCloseTo(SITE.binSouth - 0.075)
    const wall = new THREE.Box3().setFromObject(muret)
    expect(wall.min.z).toBeCloseTo(SITE.binWest - 0.075)
    expect(wall.max.z).toBeCloseTo(SITE.binEast)
  })
})
