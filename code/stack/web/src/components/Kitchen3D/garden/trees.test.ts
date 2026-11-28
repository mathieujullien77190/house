import type * as THREE from 'three'
import { copiesOf, instancedIn, limbsIn, near, plainIn, tuftsIn } from '@/test/batched'
import type { Tuft } from '@/test/batched'
import { cherryTree, clippedTree, medlarTree, prunusTree } from './trees'

/** Les touffes de feuilles d'un arbre : des cailloux à facettes de rayon 1, étirés par leur copie (pas ses fruits, taillés à leur rayon). */
const leavesOf = (tree: THREE.Group): Tuft[] => tuftsIn(tree).filter((tuft) => (tuft.mesh.geometry as THREE.IcosahedronGeometry).parameters.radius === 1)
/** Les fleurs ou les fruits d'un arbre : les copies de son maillage de cette couleur. */
const fruitsOf = (tree: THREE.Group, color: number): Tuft[] =>
  instancedIn(tree)
    .filter((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex() === color)
    .flatMap(copiesOf)
const colorOf = (tuft: Tuft): number => tuft.material.color.getHex()
/** Les maillages d'un arbre, dans l'ordre, par leur forme : le bois fondu (`BufferGeometry`), les touffes, les fleurs, les fruits. */
const partsOf = (tree: THREE.Group): string[] => tree.children.map((child) => (child as THREE.Mesh).geometry.type)
/** Tout ce qui fait la forme d'un arbre : les sommets de son bois, les places de ses touffes, fleurs et fruits. */
const shapeOf = (tree: THREE.Group): number[][] => [...plainIn(tree).map((mesh) => Array.from(mesh.geometry.attributes.position.array)), ...instancedIn(tree).map((mesh) => Array.from(mesh.instanceMatrix.array))]

describe('cherryTree', () => {
  it('la même graine donne le même arbre, une autre un arbre différent', () => {
    expect(shapeOf(cherryTree(7))).toEqual(shapeOf(cherryTree(7)))
    expect(shapeOf(cherryTree(7))).not.toEqual(shapeOf(cherryTree(19)))
  })

  it('un tronc en deux tronçons depuis le pied, une écorce pour tout le bois, trois verts pour les feuilles écrasées', () => {
    const tree = cherryTree(7)
    const limbs = limbsIn(tree)
    const leaves = leavesOf(tree)
    // Une poignée de maillages : le bois (un seul), les touffes (un par vert), puis ses fleurs et ses cerises, ajoutées à la fin.
    expect(plainIn(tree)).toHaveLength(1)
    expect(partsOf(tree)).toEqual(['BufferGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry', 'OctahedronGeometry', 'SphereGeometry'])
    // Des fleurs blanches, trois par touffe, et des cerises par deux.
    expect(fruitsOf(tree, 0xfff3f7)).toHaveLength(leaves.length * 3)
    expect(fruitsOf(tree, 0xb3122a).length).toBeGreaterThan(0)
    expect(fruitsOf(tree, 0xb3122a).length % 2).toBe(0)
    // Le premier tronçon part du pied et monte à 90 cm ; le second s'arrête à la fourche, à 1,70 m.
    const [trunk, upper] = limbs
    expect(trunk.thick).toBeCloseTo(0.16)
    expect(trunk.mid.y).toBeCloseTo(0.45)
    expect(upper.mid.y).toBeCloseTo(1.3)
    expect(new Set(leaves.map(colorOf))).toEqual(new Set([0x4f8a3a, 0x5f9a44, 0x437a34]))
    expect(new Set(leaves.map((leaf) => leaf.material)).size).toBe(3)
    for (const leaf of leaves) {
      expect(leaf.size.y / leaf.size.x).toBeGreaterThanOrEqual(0.75 - 1e-6)
      expect(leaf.size.y / leaf.size.x).toBeLessThan(0.95)
    }
    // Beaucoup de touffes, toutes au-dessus du sol, la couronne au-dessus de la fourche ; chacune tient au bois par un tronçon au moins.
    expect(leaves.length).toBeGreaterThan(200)
    expect(limbs.length).toBeGreaterThan(leaves.length)
    expect(Math.min(...leaves.map((leaf) => leaf.at.y))).toBeGreaterThan(0.5)
    expect(Math.max(...leaves.map((leaf) => leaf.at.y))).toBeGreaterThan(3)
  })

  it('`apple` : un pommier, sans fleurs ni cerises, qui porte des pommes orange sous une touffe sur trois environ ; ce n’est pas le cerisier de la même graine', () => {
    const cherry = cherryTree(31)
    const apple = cherryTree(31, true)
    // Le bois, les touffes par vert, les pommes (des cailloux à facettes, comme les touffes) : rien d'autre.
    expect(partsOf(apple)).toEqual(['BufferGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry'])
    expect(fruitsOf(apple, 0xffdbe6)).toHaveLength(0)
    expect(fruitsOf(apple, 0xfff3f7)).toHaveLength(0)
    expect(fruitsOf(apple, 0xb3122a)).toHaveLength(0)
    const apples = fruitsOf(apple, 0xe5822a)
    const leaves = leavesOf(apple)
    expect(apples.length).toBeGreaterThan(leaves.length * 0.2)
    expect(apples.length).toBeLessThan(leaves.length * 0.45)
    expect((apples[0].mesh.geometry as THREE.IcosahedronGeometry).parameters.radius).toBe(0.06)
    // Elles pendent dans la couronne, et ne portent pas d'ombre.
    expect(Math.min(...apples.map((fruit) => fruit.at.y))).toBeGreaterThan(0.3)
    expect(apples[0].mesh.userData.noShadow).toBe(true)
    // Le pommier tire un nombre de plus par touffe : sa forme n'est pas celle du cerisier.
    expect(limbsIn(apple).length).toBeGreaterThan(200)
    expect(shapeOf(apple)[0]).not.toEqual(shapeOf(cherry)[0])
    expect(shapeOf(cherryTree(31, true))).toEqual(shapeOf(apple))
  })
})

describe('prunusTree', () => {
  it('un tronc qui se sépare à 1,10 m en deux charpentières opposées, un feuillage bordeaux léger, pas de fleurs', () => {
    const tree = prunusTree(47)
    expect(shapeOf(tree)).toEqual(shapeOf(prunusTree(47)))
    // Son bois et ses touffes par teinte : il n'a pas de fleurs.
    expect(partsOf(tree)).toEqual(['BufferGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry', 'IcosahedronGeometry'])
    const limbs = limbsIn(tree)
    const leaves = leavesOf(tree)
    const [trunk] = limbs
    expect(trunk.thick).toBeCloseTo(0.14)
    expect(trunk.mid.y).toBeCloseTo(0.55)
    // Les charpentières : deux tronçons de 9 cm de pied, de part et d'autre de la fourche.
    const mains = limbs.filter((limb) => near(limb.thick, 0.09))
    expect(mains).toHaveLength(2)
    const fork = trunk.to
    const away = mains.map((main) => [main.mid.x - fork.x, main.mid.z - fork.z])
    expect(away[0][0] * away[1][0] + away[0][1] * away[1][1]).toBeLessThan(0)
    // Neuf branches par charpentière, chacune avec un rameau de côté.
    expect(limbs.filter((limb) => near(limb.thick, 0.035))).toHaveLength(18)
    expect(limbs.filter((limb) => near(limb.thick, 0.018))).toHaveLength(18)
    expect(new Set(leaves.map(colorOf))).toEqual(new Set([0x6b1f33, 0x7d2a3d, 0x561a2b]))
    // Ses touffes ne sont pas écrasées, et chacune tient au bois : il y a au moins autant de brindilles que de touffes le long des branches.
    expect(leaves.every((leaf) => near(leaf.size.y, leaf.size.x))).toBe(true)
    expect(leaves.length).toBeGreaterThan(100)
    expect(limbs.filter((limb) => near(limb.thick, 0.008)).length).toBeGreaterThan(leaves.length - 40)
    expect(Math.min(...leaves.map((leaf) => leaf.at.y))).toBeGreaterThan(1.1)
  })
})

describe('clippedTree', () => {
  it('une masse en triangle dans son angle, touffue dès le bas, d’où sortent quinze branches folles', () => {
    const tree = clippedTree(61)
    expect(shapeOf(tree)).toEqual(shapeOf(clippedTree(61)))
    // Le tronc, douze branches folles et trois au-dessus de la tête : un seul maillage.
    expect(plainIn(tree)).toHaveLength(1)
    expect(limbsIn(tree)).toHaveLength(16)
    const leaves = leavesOf(tree)
    expect(tuftsIn(tree)).toHaveLength(leaves.length)
    expect(new Set(leaves.map(colorOf))).toEqual(new Set([0x23472a, 0x2b5432, 0x1d3d24]))
    expect(instancedIn(tree)).toHaveLength(3)
    // Treize étages de boules (le tour, plus quatre en dedans), deux boules par branche folle, une par pointe.
    expect(leaves.length).toBeGreaterThan(13 * 10 + 27)
    // Touffu dès le bas, il monte à plus de 3,30 m.
    expect(Math.min(...leaves.map((leaf) => leaf.at.y))).toBeLessThan(0.4)
    expect(Math.max(...leaves.map((leaf) => leaf.at.y))).toBeGreaterThan(3.3)
    // La masse (les étages) reste dans son angle : un flanc vers −x, l'autre vers +z, à 1,50 m au plus (plus le jeu des boules) ; seules
    // les boules des branches folles et des pointes (vingt-sept) peuvent en sortir.
    const inAngle = leaves.filter((leaf) => leaf.at.x < 0.2 && leaf.at.x > -1.7 && leaf.at.z > -0.2 && leaf.at.z < 1.7)
    expect(inAngle.length).toBeGreaterThanOrEqual(leaves.length - 27)
  })
})

describe('medlarTree', () => {
  it('un tronc court, six branches en vase qui montent, de grosses touffes sombres et quelques nèfles orangées', () => {
    const tree = medlarTree(53)
    expect(shapeOf(tree)).toEqual(shapeOf(medlarTree(53)))
    // Le tronc ; par branche : deux tronçons et trois brindilles.
    const limbs = limbsIn(tree)
    expect(limbs).toHaveLength(1 + 6 * 5)
    expect(limbs[0].mid.y).toBeCloseTo(0.275)
    const fruits = fruitsOf(tree, 0xe2a23a)
    const tufts = leavesOf(tree)
    // Une touffe au bout de chaque branche, trois le long.
    expect(tufts).toHaveLength(6 * 4)
    expect(new Set(tufts.map(colorOf))).toEqual(new Set([0x2f6131, 0x3a7038, 0x28552b]))
    // Les nèfles : un seul maillage, le dernier.
    expect(fruits.length).toBeGreaterThan(0)
    expect(fruits.length).toBeLessThanOrEqual(18)
    expect(tree.children.at(-1)).toBe(fruits[0].mesh)
    expect(colorOf(fruits[0])).toBe(0xe2a23a)
    expect((fruits[0].mesh.geometry as THREE.IcosahedronGeometry).parameters.radius).toBe(0.035)
    // Petit, et serré : moins de 2,50 m de haut, moins de 1 m de rayon.
    for (const at of [...limbs.map((limb) => limb.mid), ...tufts.map((tuft) => tuft.at), ...fruits.map((fruit) => fruit.at)]) {
      expect(at.y).toBeLessThan(2.5)
      expect(Math.hypot(at.x, at.z)).toBeLessThan(1)
    }
  })
})

describe('les arbres, par lots', () => {
  it('chaque arbre tient en six maillages au plus, quel que soit le nombre de ses touffes et de ses brindilles', () => {
    for (const tree of [cherryTree(7), cherryTree(31, true), prunusTree(47), clippedTree(61), medlarTree(53)]) {
      expect(tree.children.length).toBeLessThanOrEqual(6)
      expect(tree.children.every((child) => (child as THREE.Mesh).isMesh)).toBe(true)
    }
  })
})
