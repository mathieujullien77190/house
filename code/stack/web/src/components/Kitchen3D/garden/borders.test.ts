import * as THREE from 'three'
import { UNITS_PER_METER } from '@/components/Lights/constants'
import { stubCanvasContext } from '@/test/canvas'
import { gardenMaterials } from '@/components/Kitchen3D/materials'
import { binWalls, hedges, pathAndGates } from './borders'
import { GATE_DROP, GATE_HEIGHT, HEDGE, LOT, LOW, PATH_DROP, PAVING } from './constants'
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
  it('l’arc en cinq haies (spirées, lierre, spirées), la haie taillée du nord, les spirées de l’ouest, les thuyas de l’est puis encore des spirées', () => {
    const { children, m } = built(hedges)
    expect(children.map((child) => child.type)).toEqual(['Group', 'Group', 'Group', 'Group', 'Group', 'Mesh', 'Group', 'Mesh', 'Group'])
    // La haie taillée du nord : d'un seul tenant, elle descend jusqu'au sol de la partie basse.
    const north = children[5] as THREE.Mesh
    expect(north.material).toBe(m.hedge)
    expect(sizeOf(north).width).toBe(HEDGE.thickness)
    expect(sizeOf(north).height).toBeCloseTo(HEDGE.height + LOW)
    expect(north.position.y + sizeOf(north).height / 2).toBeCloseTo(HEDGE.height)
    expect(north.position.x).toBeCloseTo(gardenX(HEDGE.north))
    // Les thuyas : 2,50 m de haut, 85 cm d'épaisseur, sur la limite est, de 20 cm avant la cage jusqu'à 35 cm au-delà du muret des poubelles.
    const thuja = children[7] as THREE.Mesh
    expect(sizeOf(thuja).height).toBe(2.5)
    expect(sizeOf(thuja).width).toBe(HEDGE.eastThickness)
    expect(thuja.position.z).toBeCloseTo(gardenZ(HEDGE.east))
    const box = new THREE.Box3().setFromObject(thuja)
    expect(box.max.x).toBeLessThan(SITE.cageX1 - 0.15)
    expect(box.max.x).toBeGreaterThan(SITE.cageX1 - 0.3)
    // (Un tronçon déborde d'un quart de son épaisseur à chaque bout.)
    expect(box.min.x).toBeCloseTo(SITE.binSouth - 0.15 - 0.35 - HEDGE.eastThickness / 4)
  })

  it('les haies qui bordent la partie basse (le bord ouest de l’arc, le lierre au-delà du portail, le bord ouest du terrain) ont le pied 20 cm plus bas', () => {
    const { children } = built(hedges)
    const bodyOf = (hedge: THREE.Object3D) => hedge.children[0] as THREE.Mesh
    const footOf = (hedge: THREE.Object3D) => bodyOf(hedge).position.y - sizeOf(bodyOf(hedge)).height / 2
    expect(footOf(children[0])).toBeCloseTo(-LOW)
    expect(footOf(children[1])).toBeCloseTo(-LOW)
    for (const index of [2, 3, 4, 8]) expect(footOf(children[index])).toBeCloseTo(0)
    expect(footOf(children[6])).toBeCloseTo(-LOW)
    // Chaque haie : un bloc par tronçon, puis ses feuilles (et ses fleurs, sauf pour le lierre : deux maillages, ou un seul).
    for (const [index, copies] of [[0, 2], [1, 1], [2, 1], [3, 2], [4, 2], [6, 2], [8, 2]]) {
      const parts = children[index].children
      expect(parts.slice(-copies).every((part) => (part as THREE.InstancedMesh).isInstancedMesh)).toBe(true)
      expect(parts.slice(0, -copies).every((part) => part.type === 'Mesh')).toBe(true)
    }
    // Les deux haies droites n'ont qu'un tronçon.
    expect(children[6].children).toHaveLength(3)
    expect(children[8].children).toHaveLength(3)
    // La dernière finit au bas de l'arc.
    expect(new THREE.Box3().setFromObject(bodyOf(children[8])).min.x).toBeCloseTo(gardenX(LOT.centerY + HEDGE.radius) - 0.15, 1)
  })

  it('le lierre (du portail du garage au cerisier, et sur 3 m de l’autre côté) est plus foncé et sans fleurs ; les spirées gardent leur vert clair', () => {
    const { children } = built(hedges)
    const colorOf = (hedge: THREE.Object3D) => ((hedge.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHex()
    const leavesOf = (hedge: THREE.Object3D) => ((hedge.children.at(-1) as THREE.InstancedMesh).material as THREE.MeshStandardMaterial).color.getHex()
    expect(colorOf(children[0])).toBe(colorOf(children[3]))
    expect(colorOf(children[1])).toBe(colorOf(children[2]))
    expect(colorOf(children[1])).not.toBe(colorOf(children[0]))
    expect(leavesOf(children[1])).toBe(0x28592d)
    expect(leavesOf(children[3])).not.toBe(0x28592d)
    // Le lierre n'a pas de fleurs blanches : son dernier maillage est celui des feuilles.
    expect(leavesOf(children[2])).toBe(0x28592d)
  })

  it('le lierre et les spirées se mêlent par leurs bouquets, mais leurs blocs verts se relaient à la limite : autant de blocs que de tronçons de l’arc, pas un de plus', () => {
    const { children } = built(hedges)
    const reach = (hedge: THREE.Object3D) => {
      const boxes = hedge.children.filter((part) => part.type === 'Mesh').map((part) => new THREE.Box3().setFromObject(part))
      return new THREE.Box3().union(boxes[0]).union(boxes.at(-1) as THREE.Box3)
    }
    // Les blocs du lierre s'arrêtent là où ceux des spirées reprennent : leurs emprises se touchent.
    expect(reach(children[2]).intersectsBox(reach(children[3]))).toBe(true)
    // Le lierre d'après le portail s'arrête à la face des poteaux du portail du garage : il ne traverse pas le portail.
    expect(reach(children[1]).intersectsBox(reach(children[2]))).toBe(false)
    // Du portail au portillon, les deux haies se partagent les tronçons de l'arc : le dernier bloc du lierre finit net où le premier des spirées commence.
    const blocksOf = (hedge: THREE.Object3D) => (hedge.children as THREE.Mesh[]).filter((part) => part.geometry.type === 'BoxGeometry')
    const [lastIvy, firstSpirea] = [blocksOf(children[2]).at(-1) as THREE.Mesh, blocksOf(children[3])[0]]
    // (Un bout net de chaque côté de la limite : les deux blocs se touchent sans se recouvrir.)
    expect(lastIvy.position.distanceTo(firstSpirea.position)).toBeCloseTo((sizeOf(lastIvy).depth + sizeOf(firstSpirea).depth) / 2, 1)
  })

  it('sur téléphone (`leafy` faux), il ne reste que le bloc vert de chaque haie : ni feuilles ni fleurs', () => {
    const group = new THREE.Group()
    hedges(group, gardenMaterials(), false)
    const spireas = group.children.filter((child) => child.type === 'Group')
    expect(spireas).toHaveLength(7)
    for (const hedge of spireas) expect(hedge.children.every((part) => part.type === 'Mesh')).toBe(true)
  })
})

describe('pathAndGates', () => {
  it('les murets du chemin du portillon et sa jardinière, le portail, le portillon et leurs poteaux de béton', () => {
    const { children, m } = built(pathAndGates)
    expect(children).toHaveLength(12)
    const meshes = children as THREE.Mesh[]
    const [west, east, westLow, eastLow, outer, earth, gate, wicket, ...posts] = meshes
    // Trois murets de la hauteur des carreaux surélevés, épais de 15 cm ; après les marches, les deux du chemin descendent avec lui.
    for (const muret of [west, east, outer]) {
      expect(muret.material).toBe(m.wall)
      expect(sizeOf(muret).height).toBeCloseTo(SITE.raised)
      expect(sizeOf(muret).width).toBe(0.15)
    }
    for (const [low, high] of [[westLow, west], [eastLow, east]]) {
      expect(low.material).toBe(m.wall)
      expect(sizeOf(low).height).toBeCloseTo(SITE.raised + PATH_DROP)
      // Son dessus reste au niveau de celui du haut ; seul son pied descend avec le chemin.
      expect(low.position.y + sizeOf(low).height / 2).toBeCloseTo(high.position.y + sizeOf(high).height / 2)
      expect(low.position.y - sizeOf(low).height / 2).toBeCloseTo(-PATH_DROP)
      expect(low.position.z).toBeCloseTo(high.position.z)
      // Il continue le haut, vers le portillon.
      expect(low.position.x).toBeLessThan(high.position.x)
    }
    expect(west.position.z).toBeCloseTo(gardenZ(PAVING.pathWest))
    expect(east.position.z).toBeCloseTo(gardenZ(PAVING.pathEast))
    // Le second muret de l'ouest double le premier à 30 cm (plus son épaisseur) ; la terre est entre les deux, un peu plus basse.
    expect(outer.position.z).toBeCloseTo(gardenZ(PAVING.pathWest - 0.45 * UNITS_PER_METER))
    expect(outer.position.z).toBeLessThan(west.position.z)
    expect(earth.position.z).toBeCloseTo((west.position.z + outer.position.z) / 2)
    expect(sizeOf(earth).height).toBeCloseTo(SITE.raised - 0.04)
    expect(sizeOf(earth).width).toBeCloseTo(0.28)
    // Le portail du garage monte à 2,10 m, le portillon fait 1,65 m ; tous deux en fer sombre.
    for (const [door, drop] of [[gate, GATE_DROP], [wicket, PATH_DROP]] as const) {
      expect(door.material).toBe(m.iron)
      expect(sizeOf(door).width).toBe(0.06)
      // En contrebas : le portillon au niveau de son chemin, le portail du garage 50 cm plus bas encore.
      expect(door.position.y - sizeOf(door).height / 2).toBeCloseTo(-drop)
    }
    expect(GATE_DROP).toBeCloseTo(PATH_DROP + 0.5)
    expect(GATE_HEIGHT).toBe(1.65)
    expect(sizeOf(gate).height).toBe(2.1)
    expect(sizeOf(wicket).height).toBe(GATE_HEIGHT)
    expect(sizeOf(gate).depth).toBeGreaterThan(sizeOf(wicket).depth)
    // Un poteau de béton de 30 cm à chaque bout : 2,50 m au portail du garage, 2 m au portillon, dans l'axe de la porte.
    expect(posts).toHaveLength(4)
    expect(posts.every((post) => post.material === m.concrete)).toBe(true)
    expect(posts.map((post) => sizeOf(post))).toEqual([2.5, 2.5, 2, 2].map((height) => ({ width: 0.3, height, depth: 0.3, widthSegments: 1, heightSegments: 1, depthSegments: 1 })))
    // En contrebas, le poteau descend avec le chemin : même sommet, plus long (le pied est au niveau du chemin).
    const planned = [SITE.gate, SITE.gate, SITE.wicket, SITE.wicket]
    posts.forEach((post, index) => {
      const door = planned[index]
      const [tall, drop] = index < 2 ? [2.5, GATE_DROP] : [2, PATH_DROP]
      const [x, z] = index % 2 === 0 ? [gardenX(door.y1), gardenZ(door.x1)] : [gardenX(door.y2), gardenZ(door.x2)]
      // Ceux du portail du garage sont à ses bouts ; ceux du portillon sont écartés de 15 cm de chaque côté.
      expect(Math.hypot(post.position.x - x, post.position.z - z)).toBeCloseTo(index < 2 ? 0 : 0.15)
      expect(post.scale.y).toBeCloseTo((tall + drop) / tall)
      expect(post.position.y + (tall * post.scale.y) / 2).toBeCloseTo(tall)
      expect(post.position.y - (tall * post.scale.y) / 2).toBeCloseTo(-drop)
    })
    // Chaque poteau est tourné comme sa porte.
    const turn = (door: typeof SITE.gate) => Math.atan2(gardenX(door.y2) - gardenX(door.y1), gardenZ(door.x2) - gardenZ(door.x1))
    ;[SITE.gate, SITE.gate, SITE.wicket, SITE.wicket].forEach((door, index) => expect(posts[index].rotation.y).toBeCloseTo(turn(door)))
    expect(wicket.position.z).toBeCloseTo((posts[2].position.z + posts[3].position.z) / 2)
    // Les poteaux du portillon sont plus écartés que le portillon n'est large.
    expect(posts[2].position.distanceTo(posts[3].position)).toBeGreaterThan(Math.hypot(gardenX(SITE.wicket.y2) - gardenX(SITE.wicket.y1), gardenZ(SITE.wicket.x2) - gardenZ(SITE.wicket.x1)) + 0.29)
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
