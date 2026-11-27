import * as THREE from 'three'
import { CAGE_HEIGHT, GRASS, HEDGE, LOT } from './constants'
import type { PlanPoint } from './constants'
import { SITE } from './layout'
import { PERGOLA } from './pergola'
import { gardenX, gardenZ } from './plan'
import { bush, choisya, creeper, fern, flowerPatch, hydrangea, passionflower, spireaHedge, wisteria } from './plants'

const meshesOf = (group: THREE.Group): THREE.Mesh[] => group.children as THREE.Mesh[]
const colorOf = (mesh: THREE.Mesh): number => (mesh.material as THREE.MeshStandardMaterial).color.getHex()
const ofType = (group: THREE.Group, type: string): THREE.Mesh[] => meshesOf(group).filter((mesh) => mesh.geometry.type === type)
const instancedOf = (group: THREE.Group): THREE.InstancedMesh[] => (group.children as THREE.InstancedMesh[]).filter((child) => child.isInstancedMesh)
const placesOf = (group: THREE.Group): number[][] => group.children.map((child) => child.position.toArray())
/** Les copies d'un maillage : leurs matrices, à plat. */
const matricesOf = (mesh: THREE.InstancedMesh): number[] => Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16))
/** La place de la copie `index` d'un maillage. */
const placeOf = (mesh: THREE.InstancedMesh, index: number): THREE.Vector3 => {
  const matrix = new THREE.Matrix4()
  mesh.getMatrixAt(index, matrix)
  return new THREE.Vector3().setFromMatrixPosition(matrix)
}
const placesIn = (mesh: THREE.InstancedMesh): THREE.Vector3[] => Array.from({ length: mesh.count }, (_, index) => placeOf(mesh, index))

describe('fern', () => {
  it('onze à quatorze frondes de trois lames de plus en plus étroites, qui partent du cœur', () => {
    const plant = fern(21)
    const blades = meshesOf(plant)
    expect(blades.length % 3).toBe(0)
    expect(blades.length / 3).toBeGreaterThanOrEqual(11)
    expect(blades.length / 3).toBeLessThanOrEqual(14)
    const widths = blades.slice(0, 3).map((blade) => (blade.geometry as THREE.BoxGeometry).parameters.width)
    expect(widths).toEqual([0.09, expect.closeTo(0.065), expect.closeTo(0.04)])
    // Trois verts au plus, vus des deux côtés.
    expect(new Set(blades.map((blade) => blade.material)).size).toBeLessThanOrEqual(3)
    for (const blade of blades) expect((blade.material as THREE.MeshStandardMaterial).side).toBe(THREE.DoubleSide)
    // Tout tient dans un rond de 65 cm autour du cœur, au-dessus du sol.
    for (const blade of blades) {
      expect(Math.hypot(blade.position.x, blade.position.z)).toBeLessThan(0.65)
      expect(blade.position.y).toBeGreaterThan(0)
    }
  })

  it('la même graine donne la même fougère, une autre une fougère différente', () => {
    expect(placesOf(fern(21))).toEqual(placesOf(fern(21)))
    expect(placesOf(fern(21))).not.toEqual(placesOf(fern(22)))
  })
})

describe('choisya', () => {
  it('une boule basse de seize touffes de deux verts, piquée de sept fleurs blanches au-dessus', () => {
    const shrub = choisya(91)
    // (Son bois nu, qu'on ne voit qu'en hiver, est un groupe à part, ajouté à la fin.)
    const all = meshesOf(shrub).filter((mesh) => mesh.isMesh)
    expect(all).toHaveLength(23)
    expect(shrub.children).toHaveLength(24)
    const flowers = all.filter((mesh) => colorOf(mesh) === 0xfafaf5)
    expect(flowers).toHaveLength(7)
    expect(new Set(flowers.map((flower) => flower.material)).size).toBe(1)
    expect(new Set(all.slice(0, 16).map((tuft) => tuft.material)).size).toBe(2)
    for (const flower of flowers) expect(flower.position.y).toBeGreaterThanOrEqual(0.33)
    for (const tuft of all.slice(0, 16)) expect(tuft.position.y).toBeLessThan(0.33)
    expect(placesOf(choisya(91))).toEqual(placesOf(shrub))
  })
})

describe('hydrangea', () => {
  it('vingt-deux touffes de feuilles et neuf boules de fleurs roses et bleues, un peu écrasées : trois au sommet, six autour', () => {
    const shrub = hydrangea(5)
    const all = meshesOf(shrub).filter((mesh) => mesh.isMesh)
    expect(all).toHaveLength(31)
    expect(shrub.children).toHaveLength(32)
    const heads = all.slice(22)
    for (const head of heads) {
      expect(head.scale.y).toBe(0.8)
      expect([0xd98fc4, 0x9aa8e6, 0xc7a0e0, 0xe6a8cf]).toContain(colorOf(head))
      expect((head.geometry as THREE.IcosahedronGeometry).parameters.detail).toBe(1)
    }
    for (const head of heads.slice(0, 3)) {
      expect(head.position.y).toBeGreaterThanOrEqual(0.6)
      expect(Math.hypot(head.position.x, head.position.z)).toBeLessThan(0.12)
    }
    for (const head of heads.slice(3)) expect(Math.hypot(head.position.x, head.position.z)).toBeGreaterThanOrEqual(0.22)
    expect(placesOf(hydrangea(5))).toEqual(placesOf(shrub))
  })
})

describe('passionflower', () => {
  const grown = (): THREE.Group => {
    const group = new THREE.Group()
    passionflower(group)
    return group
  }

  it('huit cents feuilles en un seul maillage, au plus quarante fleurs violettes, et trois tiges derrière le bac', () => {
    const group = grown()
    const [leaves, flowers] = instancedOf(group)
    expect(leaves.count).toBe(800)
    expect(flowers.count).toBeGreaterThan(10)
    expect(flowers.count).toBeLessThanOrEqual(40)
    expect(colorOf(flowers)).toBe(0x7b4fd0)
    const stems = ofType(group, 'BoxGeometry')
    expect(stems).toHaveLength(3)
    for (const stem of stems) expect(stem.position.x).toBeCloseTo(SITE.backX - 0.03)
    expect(new Set(stems.map((stem) => stem.material)).size).toBe(1)
  })

  it('les feuilles restent sur la cage : contre ses pans ou juste au-dessus', () => {
    const [leaves] = instancedOf(grown())
    for (const at of placesIn(leaves)) {
      expect(at.y).toBeGreaterThan(0.19)
      expect(at.y).toBeLessThan(CAGE_HEIGHT + 0.15)
      expect(at.x).toBeGreaterThanOrEqual(SITE.cageX1)
    }
  })

  it('toujours la même', () => {
    expect(matricesOf(instancedOf(grown())[0])).toEqual(matricesOf(instancedOf(grown())[0]))
  })
})

describe('spireaHedge', () => {
  const line: PlanPoint[] = [
    [HEDGE.east, LOT.centerY + 40],
    [HEDGE.east, LOT.centerY + HEDGE.radius],
  ]

  it('par tronçon : un bloc vert au cœur, enfoncé de `sink` ; puis deux maillages pour toute la ligne, feuilles et fleurs blanches', () => {
    const hedge = spireaHedge(line, 2.6, 0.3, 79)
    expect(hedge.children).toHaveLength(3)
    const [body] = ofType(hedge, 'BoxGeometry')
    const long = Math.abs(gardenX(line[1][1]) - gardenX(line[0][1]))
    expect((body.geometry as THREE.BoxGeometry).parameters).toMatchObject({ width: 0.6, height: expect.closeTo(2.1 + 0.3), depth: expect.closeTo(long + 0.3) })
    // Son dessus est à 2,10 m du terrain, son pied 30 cm dessous.
    expect(body.position.y).toBeCloseTo((2.1 - 0.3) / 2)
    expect(body.position.z).toBeCloseTo(gardenZ(HEDGE.east))
    const [leaves, blooms] = instancedOf(hedge)
    expect(colorOf(leaves)).toBe(0x5c9a4a)
    expect(colorOf(blooms)).toBe(0xf8f8f3)
    expect(leaves.count).toBeGreaterThan(blooms.count)
    expect(blooms.count).toBeGreaterThan(100)
  })

  it('une ligne brisée a un bloc par tronçon ; les rameaux retombent surtout du côté du jardin', () => {
    const bent: PlanPoint[] = [[HEDGE.west, HEDGE.north + 80], [HEDGE.west, HEDGE.north], [HEDGE.west + 80, HEDGE.north]]
    const hedge = spireaHedge(bent, 2.6, 0, 71)
    expect(ofType(hedge, 'BoxGeometry')).toHaveLength(2)
    expect(instancedOf(hedge)).toHaveLength(2)
    // Du côté du centre du terrain, il y a plus de feuilles que de l'autre.
    const [leaves] = instancedOf(spireaHedge(line, 2.6, 0, 79))
    const heartZ = gardenZ(LOT.centerX)
    const wallZ = gardenZ(HEDGE.east)
    const inward = placesIn(leaves).filter((at) => Math.sign(at.z - wallZ) === Math.sign(heartZ - wallZ)).length
    expect(inward).toBeGreaterThan(leaves.count / 2)
  })

  it('la même graine donne la même haie', () => {
    const leavesOf = (seed: number) => matricesOf(instancedOf(spireaHedge(line, 2.6, 0, seed))[0])
    expect(leavesOf(79)).toEqual(leavesOf(79))
    expect(leavesOf(79)).not.toEqual(leavesOf(80))
  })
})

describe('wisteria', () => {
  it('un tronc en spirale autour du poteau d’angle, des sarments sur le dessus, des feuilles et une grappe mauve sous une feuille sur quatre', () => {
    const vine = wisteria(83)
    const limbs = ofType(vine, 'CylinderGeometry')
    expect(new Set(limbs.map((limb) => limb.material)).size).toBe(1)
    // Les douze premiers tronçons : le tronc, serré contre le poteau, du sol aux chevrons.
    const postX = PERGOLA.posts.along[0]
    const postZ = PERGOLA.posts.rows[0]
    const trunk = limbs.slice(0, 12)
    for (const piece of trunk) expect(Math.hypot(piece.position.x - postX, piece.position.z - postZ)).toBeLessThan(0.1)
    expect(trunk[11].position.y).toBeLessThan(PERGOLA.top)
    // Les sarments courent au-dessus des chevrons.
    for (const runner of limbs.slice(12)) expect(runner.position.y).toBeGreaterThan(PERGOLA.top)
    const [leaves, clusters] = instancedOf(vine)
    // Six feuilles par tronçon de sarment.
    expect(leaves.count).toBe((limbs.length - 12) * 6)
    expect(clusters.count).toBe(Math.ceil(leaves.count / 4))
    expect(colorOf(clusters)).toBe(0xa98be0)
    // Les grappes pendent sous les chevrons.
    for (const at of placesIn(clusters)) expect(at.y).toBeLessThan(PERGOLA.top - PERGOLA.rafters.tall + 0.05)
  })

  it('la même graine donne la même glycine', () => {
    expect(placesOf(wisteria(83))).toEqual(placesOf(wisteria(83)))
    expect(placesOf(wisteria(83))).not.toEqual(placesOf(wisteria(84)))
  })
})

describe('bush', () => {
  it('une rangée de tiges et une masse de touffes de trois verts, de la hauteur et de la longueur données ; pas de fleurs sans `bloom`', () => {
    const shrub = bush(112, 1.2, 1.5)
    const stems = ofType(shrub, 'CylinderGeometry')
    expect(stems).toHaveLength(6)
    const tufts = ofType(shrub, 'IcosahedronGeometry')
    expect(tufts).toHaveLength(63)
    expect(new Set(tufts.map((tuft) => tuft.material)).size).toBe(3)
    for (const tuft of tufts) {
      expect(tuft.position.y).toBeGreaterThanOrEqual(0.12)
      expect(tuft.position.y).toBeLessThanOrEqual(0.12 + 1)
      expect(Math.abs(tuft.position.z)).toBeLessThanOrEqual(0.75)
    }
  })

  it('un buisson court a quand même cinq tiges ; avec `bloom`, des fleurs de cette couleur, dans le haut seulement', () => {
    expect(ofType(bush(1, 1, 0.8), 'CylinderGeometry')).toHaveLength(5)
    const shrub = bush(111, 1.2, 1.5, 0xf2cf2e)
    const flowers = ofType(shrub, 'IcosahedronGeometry').filter((mesh) => colorOf(mesh) === 0xf2cf2e)
    expect(flowers.length).toBeGreaterThan(5)
    expect(new Set(flowers.map((flower) => flower.material)).size).toBe(1)
    for (const flower of flowers) expect(flower.position.y).toBeGreaterThan(0.12 + 0.35 * 1 + 0.08)
    // Chaque fleur suit sa touffe dans le groupe, un peu au-dessus.
    const all = meshesOf(shrub)
    for (const flower of flowers) expect(flower.position.y).toBeCloseTo(all[all.indexOf(flower) - 1].position.y + 0.08)
  })
})

describe('flowerPatch', () => {
  it('trois maillages : une tige par pied, deux feuilles chacune, une fleur de la couleur donnée en haut', () => {
    const patch = flowerPatch(121, 1.3, 0.6, 0xd6247f)
    const [stems, leaves, blooms] = instancedOf(patch)
    // Sans `keep`, tout pousse : quarante-cinq pieds par défaut.
    expect(stems.count).toBe(45)
    expect(leaves.count).toBe(90)
    expect(blooms.count).toBe(45)
    expect(colorOf(blooms)).toBe(0xd6247f)
    for (const [index, foot] of placesIn(stems).entries()) {
      // Dans le rond, pas tout contre le tronc.
      const reach = Math.hypot(foot.x, foot.z)
      expect(reach).toBeGreaterThanOrEqual(0.25 - 1e-9)
      expect(reach).toBeLessThanOrEqual(1.3 + 1e-9)
      // La fleur est au bout de sa tige (dont le milieu est à mi-hauteur).
      const bloom = placeOf(blooms, index)
      expect(bloom.x).toBeCloseTo(foot.x)
      expect(bloom.y).toBeGreaterThan(foot.y * 2)
      expect(foot.y * 2).toBeGreaterThanOrEqual(0.6 * 0.75)
      expect(foot.y * 2).toBeLessThan(0.6 * 1.15)
    }
  })

  it('`keep` écarte les places où rien ne pousse ; `tries` règle le nombre de tirages', () => {
    const half = flowerPatch(121, 1.3, 0.6, 0xd6247f, (x) => x > 0, 70)
    const [stems, leaves, blooms] = instancedOf(half)
    expect(stems.count).toBeGreaterThan(15)
    expect(stems.count).toBeLessThan(55)
    expect(leaves.count).toBe(stems.count * 2)
    expect(blooms.count).toBe(stems.count)
    for (const foot of placesIn(stems)) expect(foot.x).toBeGreaterThan(0)
    expect(instancedOf(flowerPatch(1, 1, 0.5, 0xffffff, () => false))[0].count).toBe(0)
  })
})

describe('creeper', () => {
  const grown = (): THREE.Group => {
    const group = new THREE.Group()
    creeper(group)
    return group
  }

  it('un seul maillage de feuilles, chacune à sa teinte, et deux tiges qui partent du bac', () => {
    const group = grown()
    // (Le second maillage : ses grappes d'automne.)
    const [leaves] = instancedOf(group)
    expect(instancedOf(group)).toHaveLength(2)
    // Les cent soixante du dessus, plus celles du grillage (une partie des neuf cents tirages).
    expect(leaves.count).toBeGreaterThan(160 + 200)
    expect(leaves.count).toBeLessThan(160 + 900)
    expect(leaves.instanceColor).not.toBeNull()
    const stems = ofType(group, 'CylinderGeometry')
    expect(stems).toHaveLength(2)
    expect(stems[0].material).toBe(stems[1].material)
  })

  it('serrée près du pied, plus clairsemée en s’éloignant ; elle déborde sur le dessus de la cage', () => {
    const [leaves] = instancedOf(grown())
    const places = placesIn(leaves)
    const onTop = places.filter((at) => at.y > CAGE_HEIGHT)
    expect(onTop).toHaveLength(160)
    const onWire = places.filter((at) => at.y <= CAGE_HEIGHT)
    for (const at of onWire) {
      expect(at.y).toBeGreaterThanOrEqual(GRASS + 0.3)
      expect(at.z).toBeLessThan(SITE.cageZ1)
    }
    const near = onWire.filter((at) => at.x - SITE.backX < 1.05).length
    expect(near).toBeGreaterThan((onWire.length - near) * 2)
    expect(matricesOf(instancedOf(grown())[0])).toEqual(matricesOf(leaves))
  })

  it('une feuille de vigne : un seul limbe large, à cinq lobes pointus séparés par des creux peu profonds, au bord denté', () => {
    const [leaves] = instancedOf(grown())
    const shape = (leaves.geometry as THREE.ShapeGeometry).parameters.shapes as THREE.Shape
    const outline = shape.getPoints()
    expect(outline).toHaveLength(120)
    // Le contour autour du pétiole : l'écart de chaque point, par son angle (0 : le bout de la feuille).
    const reachAt = (turn: number): number => {
      const nearest = outline.reduce((best, point) => (Math.abs(Math.atan2(point.x, point.y) - turn) < Math.abs(Math.atan2(best.x, best.y) - turn) ? point : best))
      return nearest.length()
    }
    const tip = reachAt(0)
    expect(tip).toBeCloseTo(0.097)
    const axes = [0, 1.1, -1.1, 2.05, -2.05]
    const sinuses = [0.55, -0.55, 1.575, -1.575]
    // Cinq lobes : celui du bout est le plus long, ceux du bas les plus courts.
    expect(reachAt(1.1)).toBeLessThan(tip)
    expect(reachAt(2.05)).toBeLessThan(reachAt(1.1))
    expect(reachAt(-1.1)).toBeCloseTo(reachAt(1.1), 2)
    for (const sinus of sinuses) {
      // Entre deux lobes, le limbe se creuse, mais reste large : ce ne sont pas cinq folioles séparées.
      for (const axis of axes) if (Math.abs(axis - sinus) < 0.6) expect(reachAt(sinus)).toBeLessThan(reachAt(axis))
      expect(reachAt(sinus)).toBeGreaterThan(tip * 0.4)
    }
    // Vers le pétiole, il se creuse en cœur.
    expect(reachAt(Math.PI - 0.01)).toBeLessThan(tip * 0.2)
    // Plus large que haute.
    const xs = outline.map((point) => point.x)
    const ys = outline.map((point) => point.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(Math.max(...ys) - Math.min(...ys))
    // Les dents : le bord monte et redescend bien plus souvent que cinq fois.
    const reaches = outline.map((point) => point.length())
    const peaks = reaches.filter((reach, index) => reach > reaches[(index + 119) % 120] && reach > reaches[(index + 1) % 120]).length
    expect(peaks).toBeGreaterThan(12)
  })

  it('en automne : chaque feuille a sa teinte rouge ou orangée, et vingt-huit grappes de neuf baies sombres pendent devant le grillage', () => {
    const group = grown()
    const [leaves, grapes] = instancedOf(group)
    const tints = leaves.userData.tints as { base: Float32Array; autumn: Float32Array }
    expect(tints.autumn).toHaveLength(leaves.count * 3)
    expect(Array.from(tints.base)).toEqual(Array.from((leaves.instanceColor as THREE.InstancedBufferAttribute).array))
    expect(tints.base).not.toBe((leaves.instanceColor as THREE.InstancedBufferAttribute).array)
    for (let index = 0; index < leaves.count; index += 1) expect(tints.autumn[index * 3]).toBeGreaterThan(tints.autumn[index * 3 + 1])
    expect(grapes.userData.season).toBe('harvest')
    expect(grapes.count).toBe(28 * 9)
    expect((grapes.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x2b2147)
    for (const at of placesIn(grapes)) {
      // Devant le grillage (dehors), entre le sol et le haut de la cage.
      expect(at.z).toBeLessThan(SITE.cageZ1)
      expect(at.y).toBeGreaterThan(GRASS)
      expect(at.y).toBeLessThan(CAGE_HEIGHT)
    }
    expect(matricesOf(instancedOf(grown())[1])).toEqual(matricesOf(grapes))
  })
})

describe('le vent et la neige sur les plantes', () => {
  it('fougère, arbustes, buisson et massif se balancent tout entiers ; spirées et glycine par leurs feuilles et leurs fleurs', () => {
    for (const plant of [fern(21), choisya(91), hydrangea(5), bush(111, 1.2, 1.5), flowerPatch(121, 1.3, 0.6, 0xd6247f)]) expect(plant.userData.sway).toBeGreaterThan(0)
    const hedge = spireaHedge([[0, 400], [200, 400]], 2.6, 0, 71)
    expect(hedge.userData.sway).toBeUndefined()
    expect(instancedOf(hedge).map((mesh) => mesh.userData.sway)).toEqual([0.04, 0.04])
    const vine = wisteria(83)
    expect(vine.userData.sway).toBeUndefined()
    expect(instancedOf(vine).map((mesh) => mesh.userData.sway)).toEqual([0.015, 0.015])
  })

  it('la neige tient sur le bloc des spirées, au-dessus des bouquets qui le couvrent', () => {
    const hedge = spireaHedge([[0, 400], [200, 400], [300, 500]], 2.6, 0, 71)
    const blocks = ofType(hedge, 'BoxGeometry')
    expect(blocks).toHaveLength(2)
    expect(blocks.map((block) => block.userData.snow)).toEqual([0.2, 0.2])
  })
})
