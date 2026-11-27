import type * as THREE from 'three'
import { cherryTree, clippedTree, medlarTree, prunusTree } from './trees'

const meshesOf = (tree: THREE.Group): THREE.Mesh[] => tree.children as THREE.Mesh[]
const limbsOf = (tree: THREE.Group): THREE.Mesh[] => meshesOf(tree).filter((mesh) => mesh.geometry.type === 'CylinderGeometry')
const leavesOf = (tree: THREE.Group): THREE.Mesh[] => meshesOf(tree).filter((mesh) => mesh.geometry.type === 'IcosahedronGeometry')
const colorOf = (mesh: THREE.Mesh): number => (mesh.material as THREE.MeshStandardMaterial).color.getHex()
const placesOf = (tree: THREE.Group): number[][] => tree.children.map((child) => child.position.toArray())
const radiusOf = (mesh: THREE.Mesh): number => (mesh.geometry as THREE.IcosahedronGeometry).parameters.radius

describe('cherryTree', () => {
  it('la même graine donne le même arbre, une autre un arbre différent', () => {
    expect(placesOf(cherryTree(7))).toEqual(placesOf(cherryTree(7)))
    expect(placesOf(cherryTree(7))).not.toEqual(placesOf(cherryTree(19)))
  })

  it('un tronc en deux tronçons depuis le pied, une écorce pour tout le bois, trois verts pour les feuilles écrasées', () => {
    const tree = cherryTree(7)
    const limbs = limbsOf(tree)
    const leaves = leavesOf(tree)
    expect(limbs.length + leaves.length).toBe(tree.children.length)
    expect(new Set(limbs.map((limb) => limb.material)).size).toBe(1)
    // Le premier tronçon part du pied et monte à 90 cm ; le second s'arrête à la fourche, à 1,70 m.
    const [trunk, upper] = limbs
    expect((trunk.geometry as THREE.CylinderGeometry).parameters.radiusBottom).toBe(0.16)
    expect(trunk.position.y).toBeCloseTo(0.45)
    expect(upper.position.y).toBeCloseTo(1.3)
    expect(new Set(leaves.map(colorOf))).toEqual(new Set([0x4f8a3a, 0x5f9a44, 0x437a34]))
    expect(new Set(leaves.map((leaf) => leaf.material)).size).toBe(3)
    for (const leaf of leaves) {
      expect(leaf.scale.y).toBeGreaterThanOrEqual(0.75)
      expect(leaf.scale.y).toBeLessThan(0.95)
    }
    // Beaucoup de touffes, toutes au-dessus du sol, la couronne au-dessus de la fourche.
    expect(leaves.length).toBeGreaterThan(200)
    expect(Math.min(...leaves.map((leaf) => leaf.position.y))).toBeGreaterThan(0.5)
    expect(Math.max(...leaves.map((leaf) => leaf.position.y))).toBeGreaterThan(3)
  })

  it('sans `fruit`, pas de fruits ; avec, des pommes rondes pendent sous quelques touffes', () => {
    const fruitsOf = (tree: THREE.Group) => leavesOf(tree).filter((mesh) => radiusOf(mesh) === 0.045)
    expect(fruitsOf(cherryTree(31))).toHaveLength(0)
    const apple = cherryTree(31, 0xc8402f)
    const fruits = fruitsOf(apple)
    const tufts = leavesOf(apple).length - fruits.length
    expect(fruits.length).toBeGreaterThan(10)
    // Une touffe sur sept environ en porte un.
    expect(fruits.length).toBeLessThan(tufts / 3)
    expect(new Set(fruits.map(colorOf))).toEqual(new Set([0xc8402f]))
    // Chaque fruit suit sa touffe dans le groupe, à son aplomb et plus bas.
    const children = meshesOf(apple)
    for (const fruit of fruits) {
      const tuft = children[children.indexOf(fruit) - 1]
      expect(fruit.position.x).toBe(tuft.position.x)
      expect(fruit.position.z).toBe(tuft.position.z)
      expect(fruit.position.y).toBeCloseTo(tuft.position.y - radiusOf(tuft) * 0.8)
      expect(fruit.scale.y).toBe(1)
    }
  })
})

describe('prunusTree', () => {
  it('un tronc qui se sépare à 1,10 m en deux charpentières opposées, un feuillage bordeaux léger', () => {
    const tree = prunusTree(47)
    expect(placesOf(tree)).toEqual(placesOf(prunusTree(47)))
    const limbs = limbsOf(tree)
    const leaves = leavesOf(tree)
    const [trunk] = limbs
    expect((trunk.geometry as THREE.CylinderGeometry).parameters.radiusBottom).toBe(0.14)
    expect(trunk.position.y).toBeCloseTo(0.55)
    // Les charpentières : deux tronçons de 9 cm de pied, de part et d'autre de la fourche.
    const mains = limbs.filter((limb) => (limb.geometry as THREE.CylinderGeometry).parameters.radiusBottom === 0.09)
    expect(mains).toHaveLength(2)
    const fork = { x: trunk.position.x * 2, z: trunk.position.z * 2 }
    const away = mains.map((main) => [main.position.x - fork.x, main.position.z - fork.z])
    expect(away[0][0] * away[1][0] + away[0][1] * away[1][1]).toBeLessThan(0)
    // Neuf branches par charpentière, chacune avec un rameau de côté.
    expect(limbs.filter((limb) => (limb.geometry as THREE.CylinderGeometry).parameters.radiusBottom === 0.035)).toHaveLength(18)
    expect(limbs.filter((limb) => (limb.geometry as THREE.CylinderGeometry).parameters.radiusBottom === 0.018)).toHaveLength(18)
    expect(new Set(leaves.map(colorOf))).toEqual(new Set([0x6b1f33, 0x7d2a3d, 0x561a2b]))
    // Ses touffes ne sont pas écrasées, et chacune tient au bois : il y a au moins autant de brindilles que de touffes le long des branches.
    expect(leaves.every((leaf) => leaf.scale.y === 1)).toBe(true)
    expect(leaves.length).toBeGreaterThan(100)
    expect(Math.min(...leaves.map((leaf) => leaf.position.y))).toBeGreaterThan(1.1)
  })
})

describe('clippedTree', () => {
  it('une masse en triangle dans son angle, touffue dès le bas, d’où sortent quinze branches folles', () => {
    const tree = clippedTree(61)
    expect(placesOf(tree)).toEqual(placesOf(clippedTree(61)))
    // Le tronc, douze branches folles et trois au-dessus de la tête.
    expect(limbsOf(tree)).toHaveLength(16)
    const leaves = leavesOf(tree)
    expect(new Set(leaves.map(colorOf))).toEqual(new Set([0x23472a, 0x2b5432, 0x1d3d24]))
    expect(new Set(leaves.map((leaf) => leaf.material)).size).toBe(3)
    // Treize étages de boules (le tour, plus quatre en dedans), deux boules par branche folle, une par pointe.
    expect(leaves.length).toBe(leaves.filter((leaf) => leaf.position.y < 3.5).length + leaves.filter((leaf) => leaf.position.y >= 3.5).length)
    expect(leaves.length).toBeGreaterThan(13 * 10 + 27)
    // Touffu dès le bas, il monte à plus de 3,30 m.
    expect(Math.min(...leaves.map((leaf) => leaf.position.y))).toBeLessThan(0.4)
    expect(Math.max(...leaves.map((leaf) => leaf.position.y))).toBeGreaterThan(3.3)
    // La masse (les étages) reste dans son angle : un flanc vers −x, l'autre vers +z, à 1,50 m au plus (plus le jeu des boules).
    const mass = leaves.slice(0, 13 * 10)
    for (const leaf of mass) {
      expect(leaf.position.x).toBeLessThan(0.2)
      expect(leaf.position.x).toBeGreaterThan(-1.7)
      expect(leaf.position.z).toBeGreaterThan(-0.2)
      expect(leaf.position.z).toBeLessThan(1.7)
    }
  })
})

describe('medlarTree', () => {
  it('un tronc court, six branches en vase qui montent, de grosses touffes sombres et quelques nèfles orangées', () => {
    const tree = medlarTree(53)
    expect(placesOf(tree)).toEqual(placesOf(medlarTree(53)))
    // Le tronc ; par branche : deux tronçons et trois brindilles.
    const limbs = limbsOf(tree)
    expect(limbs).toHaveLength(1 + 6 * 5)
    expect(limbs[0].position.y).toBeCloseTo(0.275)
    const fruits = leavesOf(tree).filter((mesh) => radiusOf(mesh) === 0.035)
    const tufts = leavesOf(tree).filter((mesh) => radiusOf(mesh) !== 0.035)
    // Une touffe au bout de chaque branche, trois le long.
    expect(tufts).toHaveLength(6 * 4)
    expect(new Set(tufts.map(colorOf))).toEqual(new Set([0x2f6131, 0x3a7038, 0x28552b]))
    expect(fruits.length).toBeGreaterThan(0)
    expect(fruits.length).toBeLessThanOrEqual(18)
    expect(new Set(fruits.map((fruit) => fruit.material)).size).toBe(1)
    expect(colorOf(fruits[0])).toBe(0xe2a23a)
    // Petit, et serré : moins de 2,50 m de haut, moins de 1 m de rayon.
    for (const mesh of meshesOf(tree)) {
      expect(mesh.position.y).toBeLessThan(2.5)
      expect(Math.hypot(mesh.position.x, mesh.position.z)).toBeLessThan(1)
    }
  })
})
