import * as THREE from 'three'
import { CAGE_HEIGHT, GRASS, HEDGE, LOT } from './constants'
import type { PlanPoint } from './constants'
import { BATH_WINDOW } from '@/components/Kitchen3D/constants'
import { SITE } from './layout'
import { PERGOLA } from './pergola'
import { gardenX, gardenZ, inLot } from './plan'
import { instancedIn, limbsIn, limbsOf, near, plainIn, tuftsIn } from '@/test/batched'
import { bush, choisya, fern, flowerPatch, hydrangea, paleTree, passionflower, rosemary, spireaHedge, vineArch, wildConifer, wisteria } from './plants'

const meshesOf = (group: THREE.Group): THREE.Mesh[] => group.children as THREE.Mesh[]
const colorOf = (mesh: THREE.Mesh): number => (mesh.material as THREE.MeshStandardMaterial).color.getHex()
const ofType = (group: THREE.Group, type: string): THREE.Mesh[] => meshesOf(group).filter((mesh) => mesh.geometry.type === type)
const instancedOf = (group: THREE.Group): THREE.InstancedMesh[] => (group.children as THREE.InstancedMesh[]).filter((child) => child.isInstancedMesh)
/** Tout ce qui fait la forme d'une plante : les sommets de ses maillages fondus et les places des copies des autres. */
const shapeOf = (group: THREE.Group): number[][] => [...plainIn(group).map((mesh) => Array.from(mesh.geometry.attributes.position.array)), ...instancedIn(group).map((mesh) => Array.from(mesh.instanceMatrix.array))]
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
  it('onze à quatorze frondes de trois nervures à folioles, qui partent du cœur ; les lames d’un même vert font un seul maillage', () => {
    const plant = fern(21)
    const greens = plainIn(plant)
    // Trois verts au plus, vus des deux côtés : un maillage chacun, rien d'autre.
    expect(greens.length).toBeLessThanOrEqual(3)
    expect(plant.children).toHaveLength(greens.length)
    expect(new Set(greens.map((green) => green.material)).size).toBe(greens.length)
    for (const green of greens) expect((green.material as THREE.MeshStandardMaterial).side).toBe(THREE.DoubleSide)
    // Une fronde : trois nervures (des pavés de 24 sommets), et à chacune dix folioles plates (4 sommets) : 192 sommets.
    const fronds = greens.reduce((sum, green) => sum + green.geometry.attributes.position.count, 0) / (3 * 24 + 3 * 10 * 4)
    expect(Number.isInteger(fronds)).toBe(true)
    expect(fronds).toBeGreaterThanOrEqual(11)
    expect(fronds).toBeLessThanOrEqual(14)
    // Tout tient dans un rond de 70 cm autour du cœur, au-dessus du sol (à l'épaisseur d'une lame près).
    for (const green of greens) {
      green.geometry.computeBoundingBox()
      const { min, max } = green.geometry.boundingBox as THREE.Box3
      expect(Math.max(Math.abs(min.x), Math.abs(max.x), Math.abs(min.z), Math.abs(max.z))).toBeLessThan(0.7)
      expect(min.y).toBeGreaterThan(-0.01)
      expect(max.y).toBeLessThan(0.5)
    }
    // Aucune marque : ses lames sont fondues avec le reste de la scène.
    expect(plant.userData).toEqual({})
  })

  it('la même graine donne la même fougère, une autre une fougère différente', () => {
    expect(shapeOf(fern(21))).toEqual(shapeOf(fern(21)))
    expect(shapeOf(fern(21))).not.toEqual(shapeOf(fern(22)))
  })
})

describe('choisya', () => {
  it('une boule basse de seize touffes de deux verts, piquée de sept fleurs blanches au-dessus', () => {
    const shrub = choisya(91)
    // Trois maillages : un par vert, puis les fleurs.
    expect(shrub.children).toHaveLength(3)
    const all = tuftsIn(shrub)
    expect(all).toHaveLength(23)
    const flowers = all.filter((tuft) => tuft.material.color.getHex() === 0xfafaf5)
    const leaves = all.filter((tuft) => tuft.material.color.getHex() !== 0xfafaf5)
    expect(flowers).toHaveLength(7)
    expect(leaves).toHaveLength(16)
    expect(new Set(flowers.map((flower) => flower.mesh)).size).toBe(1)
    expect(new Set(leaves.map((tuft) => tuft.material)).size).toBe(2)
    for (const flower of flowers) {
      expect(flower.at.y).toBeGreaterThanOrEqual(0.33)
      expect(flower.size.x).toBeCloseTo(0.025)
    }
    for (const tuft of leaves) expect(tuft.at.y).toBeLessThan(0.33)
    // Pas de bois dessiné.
    expect(limbsIn(shrub)).toHaveLength(0)
    expect(shapeOf(choisya(91))).toEqual(shapeOf(shrub))
  })
})

describe('hydrangea', () => {
  it('vingt-deux touffes de feuilles et neuf boules de fleurs roses et bleues, un peu écrasées : trois au sommet, six autour', () => {
    const shrub = hydrangea(5)
    const all = tuftsIn(shrub)
    expect(all).toHaveLength(31)
    // Les boules de fleurs sont plus rondes que les touffes de feuilles (un caillou plus fin).
    const detailOf = (tuft: (typeof all)[number]): number => (tuft.mesh.geometry as THREE.IcosahedronGeometry).parameters.detail
    expect(all.filter((tuft) => detailOf(tuft) === 0)).toHaveLength(22)
    // Un maillage par vert, un par teinte de fleurs (quatre au plus).
    expect(shrub.children.length).toBeLessThanOrEqual(2 + 4)
    const heads = all.filter((tuft) => detailOf(tuft) === 1)
    expect(heads).toHaveLength(9)
    for (const head of heads) {
      expect(head.size.y / head.size.x).toBeCloseTo(0.8)
      expect([0xd98fc4, 0x9aa8e6, 0xc7a0e0, 0xe6a8cf]).toContain(head.material.color.getHex())
    }
    const top = heads.filter((head) => head.at.y >= 0.6)
    expect(top).toHaveLength(3)
    for (const head of top) expect(Math.hypot(head.at.x, head.at.z)).toBeLessThan(0.12)
    for (const head of heads.filter((each) => each.at.y < 0.6)) expect(Math.hypot(head.at.x, head.at.z)).toBeGreaterThanOrEqual(0.22 - 1e-6)
    expect(shapeOf(hydrangea(5))).toEqual(shapeOf(shrub))
  })
})

describe('passionflower', () => {
  const grown = (): THREE.Group => {
    const group = new THREE.Group()
    passionflower(group)
    return group
  }

  it('une tige courte, des feuilles plates palmées en un seul maillage sans ombre, et dix fleurs de passiflore devant elles', () => {
    const group = grown()
    // Le bois (un maillage fondu), les feuilles (un `InstancedMesh`), puis dix fleurs.
    expect(group.children).toHaveLength(12)
    expect(limbsIn(group)).toHaveLength(2)
    const [leaves] = instancedOf(group)
    expect(instancedOf(group)).toHaveLength(1)
    expect(leaves.count).toBeGreaterThan(1000)
    expect(leaves.userData.noShadow).toBe(true)
    expect(leaves.instanceColor).not.toBeNull()
    // Une feuille palmée : un contour de quarante points, plat.
    const outline = ((leaves.geometry as THREE.ShapeGeometry).parameters.shapes as THREE.Shape).getPoints()
    expect(outline).toHaveLength(40)
    // Les fleurs : des pétales pâles, une couronne violette, un cœur sombre, une colonne, cinq étamines et trois stigmates.
    const flowers = group.children.filter((child) => child.type === 'Group') as THREE.Group[]
    expect(flowers).toHaveLength(10)
    for (const flower of flowers) {
      expect(flower.children).toHaveLength(12)
      expect(colorOf(flower.children[0] as THREE.Mesh)).toBe(0xe6def2)
      expect(colorOf(flower.children[1] as THREE.Mesh)).toBe(0x6d3fc4)
    }
    // Elles sont près du bac, à moins de 10 cm devant un pan, et toutes tournées vers le dehors.
    for (const flower of flowers) {
      expect(flower.position.y).toBeGreaterThan(0.6)
      expect(flower.position.y).toBeLessThan(CAGE_HEIGHT)
    }
  })

  it('la tige sort de la terre du bac et monte au pan de l’ouest', () => {
    const [low, high] = limbsIn(grown())
    expect(low.from.x).toBeCloseTo(SITE.backX - 0.3)
    expect(low.from.y).toBeCloseTo(0.44)
    expect(low.to.y).toBeCloseTo(0.85)
    expect(high.from.y).toBeCloseTo(0.85)
    expect(high.to.y).toBeCloseTo(1.25)
    // Elle finit sur le pan de l'ouest, côté bac.
    expect(low.to.x).toBeCloseTo(SITE.backX - 0.04)
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
    // Les bouquets ne portent pas d'ombre (seul le bloc en porte une).
    expect([leaves.userData.noShadow, blooms.userData.noShadow, body.userData.noShadow]).toEqual([true, true, undefined])
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

  it('le lierre (`ivy`) : un bloc plus étroit et plus sombre, des feuilles vert foncé et pas de fleurs blanches', () => {
    const ivy = spireaHedge(line, 2.6, 0, 79, true, true)
    // Un seul maillage de copies : les feuilles ; pas de fleurs.
    expect(instancedOf(ivy)).toHaveLength(1)
    expect(colorOf(instancedOf(ivy)[0])).toBe(0x28592d)
    const [body] = ofType(ivy, 'BoxGeometry')
    expect((body.geometry as THREE.BoxGeometry).parameters.width).toBe(0.56)
    expect(colorOf(body)).toBe(0x1f4524)
    expect(colorOf(ofType(spireaHedge(line, 2.6, 0, 79), 'BoxGeometry')[0])).toBe(0x3f7a3a)
  })

  it('sans `leafy` (téléphone) : le bloc vert seul, sans feuilles ni fleurs', () => {
    const bare = spireaHedge(line, 2.6, 0, 79, false)
    expect(bare.children).toHaveLength(1)
    expect(bare.children[0].type).toBe('Mesh')
    // Le lierre aussi.
    expect(spireaHedge(line, 2.6, 0, 79, false, true).children).toHaveLength(1)
  })

  it('`spread` et `toGround` : les rameaux avancent plus loin sur le terrain et descendent jusqu’à terre, avec moins de bouquets', () => {
    const normal = instancedOf(spireaHedge(line, 2.6, 0, 79))[0]
    const wide = instancedOf(spireaHedge(line, 2.6, 0, 79, true, false, 1.9, true))[0]
    expect(wide.count).toBeLessThan(normal.count)
    const wallZ = gardenZ(HEDGE.east)
    const reach = (mesh: THREE.InstancedMesh) => Math.max(...placesIn(mesh).map((at) => Math.abs(at.z - wallZ)))
    expect(reach(wide)).toBeGreaterThan(reach(normal))
    // Plus bas : des feuilles près de l'herbe.
    const low = (mesh: THREE.InstancedMesh) => placesIn(mesh).filter((at) => at.y < 0.5).length
    expect(low(wide)).toBeGreaterThan(low(normal))
  })

  it('rien ne dépasse de la propriété : les bouquets sont tous dans les limites du terrain', () => {
    const hedge = spireaHedge([[HEDGE.east, LOT.centerY + 40], [HEDGE.east, LOT.centerY + HEDGE.radius]], 2.6, 0, 79, true, false, 1.9, true)
    for (const mesh of instancedOf(hedge)) for (const at of placesIn(mesh)) expect(inLot(at.x, at.z)).toBe(true)
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
    // Tout le bois fait un seul maillage.
    expect(plainIn(vine)).toHaveLength(1)
    const limbs = limbsIn(vine)
    // Les douze premiers tronçons : le tronc, serré contre le poteau, du sol aux chevrons.
    const postX = PERGOLA.posts.along[0]
    const postZ = PERGOLA.posts.rows[0]
    const trunk = limbs.slice(0, 12)
    for (const piece of trunk) expect(Math.hypot(piece.mid.x - postX, piece.mid.z - postZ)).toBeLessThan(0.1)
    expect(trunk[11].mid.y).toBeLessThan(PERGOLA.top)
    // Les sarments courent au-dessus des chevrons.
    for (const runner of limbs.slice(12)) expect(runner.mid.y).toBeGreaterThan(PERGOLA.top)
    const [leaves, clusters] = instancedOf(vine)
    // Six feuilles par tronçon de sarment.
    expect(leaves.count).toBe((limbs.length - 12) * 6)
    expect(clusters.count).toBe(Math.ceil(leaves.count / 4))
    expect(colorOf(clusters)).toBe(0xa98be0)
    // Les grappes pendent sous les chevrons, sans porter d'ombre ; les feuilles en portent une sur la terrasse.
    for (const at of placesIn(clusters)) expect(at.y).toBeLessThan(PERGOLA.top - PERGOLA.rafters.tall + 0.05)
    expect([leaves.userData.noShadow, clusters.userData.noShadow]).toEqual([undefined, true])
  })

  it('la même graine donne la même glycine', () => {
    expect(shapeOf(wisteria(83))).toEqual(shapeOf(wisteria(83)))
    expect(shapeOf(wisteria(83))).not.toEqual(shapeOf(wisteria(84)))
  })
})

describe('bush', () => {
  it('une rangée de tiges et une masse de touffes de trois verts, de la hauteur et de la longueur données ; pas de fleurs sans `bloom`', () => {
    const shrub = bush(112, 1.2, 1.5)
    // Les tiges font un seul maillage, les touffes un par vert.
    expect(shrub.children.map((child) => (child as THREE.Mesh).geometry.type)).toEqual(['BufferGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry'])
    expect(limbsIn(shrub)).toHaveLength(6)
    const tufts = tuftsIn(shrub)
    expect(tufts).toHaveLength(63)
    expect(new Set(tufts.map((tuft) => tuft.material)).size).toBe(3)
    for (const tuft of tufts) {
      expect(tuft.at.y).toBeGreaterThanOrEqual(0.12)
      expect(tuft.at.y).toBeLessThanOrEqual(0.12 + 1)
      expect(Math.abs(tuft.at.z)).toBeLessThanOrEqual(0.75)
    }
  })

  it('un buisson court a quand même cinq tiges ; avec `bloom`, des fleurs de cette couleur, dans le haut seulement', () => {
    expect(limbsIn(bush(1, 1, 0.8))).toHaveLength(5)
    const shrub = bush(111, 1.2, 1.5, 0xf2cf2e)
    const flowers = tuftsIn(shrub).filter((tuft) => tuft.material.color.getHex() === 0xf2cf2e)
    const leaves = tuftsIn(shrub).filter((tuft) => tuft.material.color.getHex() !== 0xf2cf2e)
    expect(flowers.length).toBeGreaterThan(5)
    // Un seul maillage pour les fleurs, ajouté après les feuilles.
    expect(new Set(flowers.map((flower) => flower.mesh)).size).toBe(1)
    expect(shrub.children.at(-1)).toBe(flowers[0].mesh)
    for (const flower of flowers) {
      expect(flower.at.y).toBeGreaterThan(0.12 + 0.35 * 1 + 0.08)
      // Chaque fleur est posée un peu au-dessus de sa touffe.
      expect(leaves.some((tuft) => near(tuft.at.y + 0.08, flower.at.y) && near(tuft.at.z, flower.at.z))).toBe(true)
    }
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

describe('vineArch', () => {
  const grown = (): { group: THREE.Group; timber: THREE.Material } => {
    const group = new THREE.Group()
    const timber = new THREE.MeshStandardMaterial({ color: 0x8a6a45 })
    vineArch(group, timber)
    return { group, timber }
  }

  it('une arche carrée en treillis de bois (un seul maillage, le bois donné), un cep, des feuilles, des grappes et des feuilles par terre', () => {
    const { group, timber } = grown()
    const [arch, vine] = plainIn(group)
    expect(arch.material).toBe(timber)
    expect(plainIn(group)).toHaveLength(2)
    expect(colorOf(vine)).toBe(0x5a4a3a)
    // Le cep : soixante tronçons de plus en plus fins.
    expect(limbsOf(vine)).toHaveLength(60)
    // Des feuilles (trois verts), des grappes (trois violets, sans ombre), des feuilles au sol (trois verts, sans ombre).
    const batches = instancedIn(group)
    expect(batches).toHaveLength(9)
    expect(batches.filter((mesh) => mesh.userData.noShadow === true)).toHaveLength(6)
    expect(tuftsIn(group).length).toBe(90 + 12 * 9 + 45)
  })

  it('l’arche fait 1,20 m de large et 2,10 m de haut, en face de la fenêtre de la salle de bain, devant la bande de béton de la haie du nord', () => {
    const { group } = grown()
    const [arch] = plainIn(group)
    arch.geometry.computeBoundingBox()
    const box = arch.geometry.boundingBox as THREE.Box3
    expect(box.max.y - GRASS).toBeCloseTo(2.1, 1)
    expect(box.min.y).toBeCloseTo(GRASS, 1)
    expect(box.max.z - box.min.z).toBeCloseTo(1.2, 1)
    expect((box.max.z + box.min.z) / 2).toBeCloseTo(BATH_WINDOW.z, 1)
    // Les deux côtés sont à 40 cm l'un de l'autre.
    expect(box.max.x - box.min.x).toBeCloseTo(0.4, 1)
    expect((box.max.x + box.min.x) / 2).toBeLessThan(gardenX(HEDGE.north) - HEDGE.thickness / 2)
  })

  it('toujours la même', () => {
    expect(shapeOf(grown().group)).toEqual(shapeOf(grown().group))
  })
})

describe('wildConifer', () => {
  it('un tronc, et une masse de quatre verts du plus sombre au plus clair ; rien par-dessus la cage si l’arbre est trop bas', () => {
    const tree = wildConifer(151, 3, 99)
    expect(plainIn(tree)).toHaveLength(1)
    const greens = tuftsIn(tree)
    // Quatre teintes au plus, une copie par touffe.
    expect(instancedIn(tree).length).toBeLessThanOrEqual(4)
    expect(greens.length).toBe(85)
    // Le tronc monte à 95 % de la hauteur.
    const [trunk] = limbsIn(tree)
    expect(trunk.to.y).toBeCloseTo(3 * 0.95, 1)
    // Rien ne passe par-dessus la cage (`over` plus haut que l'arbre) ni vers un voisin (`mingle` à 0) : un seul tronçon de bois.
    expect(limbsIn(tree)).toHaveLength(1)
  })

  it('au-dessus de `over`, sept branches partent vers −x, par-dessus la cage, avec leurs touffes', () => {
    const tree = wildConifer(137, 4.3, 2)
    expect(limbsIn(tree)).toHaveLength(1 + 7)
    expect(tuftsIn(tree).length).toBe(85 + 7 * 5)
    // Elles s'étendent vers −x, et aucune n'est sous `over`.
    const [, ...branches] = limbsIn(tree)
    for (const branch of branches) {
      expect(branch.to.x).toBeLessThan(branch.from.x)
      expect(branch.to.y).toBeGreaterThanOrEqual(2 + 0.12 - 1e-5)
    }
  })

  it('`mingle` : sept branches de plus filent le long de la haie vers −z, pour se mêler à l’arbre voisin', () => {
    const alone = wildConifer(137, 4.3, 2)
    const mingled = wildConifer(137, 4.3, 2, 3)
    expect(limbsIn(mingled)).toHaveLength(limbsIn(alone).length + 7)
    expect(tuftsIn(mingled).length).toBe(tuftsIn(alone).length + 7 * 7)
    const reach = limbsIn(mingled).slice(-7)
    for (const branch of reach) expect(branch.to.z).toBeLessThan(branch.from.z - 2)
  })
})

describe('paleTree', () => {
  it('un tronc, six branches qui s’écartent et une couronne de soixante touffes de quatre verts tendres, plus haute que large', () => {
    const tree = paleTree(139, 4.3)
    expect(limbsIn(tree)).toHaveLength(1 + 6)
    const crown = tuftsIn(tree)
    expect(crown).toHaveLength(60)
    expect(instancedIn(tree).length).toBeLessThanOrEqual(4)
    // Le tronc monte aux quatre cinquièmes de la hauteur.
    expect(limbsIn(tree)[0].to.y).toBeCloseTo(4.3 * 0.8, 1)
    // La couronne : en œuf, centrée en haut de l'arbre.
    const ys = crown.map((tuft) => tuft.at.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(2)
    expect(Math.max(...crown.map((tuft) => Math.hypot(tuft.at.x, tuft.at.z)))).toBeLessThan(1.5)
    expect(shapeOf(paleTree(139, 4.3))).toEqual(shapeOf(tree))
  })
})

describe('rosemary', () => {
  it('quinze tiges ligneuses (six tronçons chacune) qui rayonnent et s’arquent, garnies de touffes sombres, et de petites fleurs bleu pâle au bout', () => {
    const bush = rosemary(149)
    expect(limbsIn(bush)).toHaveLength(15 * 6)
    const all = tuftsIn(bush)
    const flowers = all.filter((tuft) => tuft.material.color.getHex() === 0x9db8e0)
    const needles = all.filter((tuft) => tuft.material.color.getHex() !== 0x9db8e0)
    // Douze touffes au cœur, puis une (deux premiers tronçons) ou deux (les quatre derniers) par tronçon.
    expect(needles).toHaveLength(12 + 15 * (2 * 1 + 4 * 2))
    expect(new Set(needles.map((tuft) => tuft.material)).size).toBe(4)
    // Les fleurs ne sont que sur les deux derniers tronçons de chaque tige : tout au plus trente.
    expect(flowers.length).toBeGreaterThan(5)
    expect(flowers.length).toBeLessThanOrEqual(30)
    for (const flower of flowers) expect(flower.size.x).toBeCloseTo(0.022)
    // Tout tient dans un rond d'un mètre, sous 80 cm.
    for (const tuft of all) {
      expect(Math.hypot(tuft.at.x, tuft.at.z)).toBeLessThan(1.1)
      expect(tuft.at.y).toBeLessThan(0.9)
    }
    expect(shapeOf(rosemary(149))).toEqual(shapeOf(bush))
  })
})

describe('l’ombre sur les plantes', () => {
  it('plus rien ne se balance : aucune plante ne porte de marque de vent', () => {
    for (const plant of [fern(21), choisya(91), hydrangea(5), bush(111, 1.2, 1.5), flowerPatch(121, 1.3, 0.6, 0xd6247f), spireaHedge([[0, 400], [200, 400]], 2.6, 0, 71), wisteria(83)]) {
      plant.traverse((child) => expect(child.userData.sway).toBeUndefined())
    }
  })

  it('un massif de fleurs est trop fin pour porter une ombre', () => {
    expect(instancedOf(flowerPatch(121, 1.3, 0.6, 0xd6247f)).map((mesh) => mesh.userData.noShadow)).toEqual([true, true, true])
  })
})
