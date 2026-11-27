import type * as THREE from 'three'
import { laurelBush } from './laurel'

const limbsOf = (bush: THREE.Group): THREE.Mesh[] => (bush.children as THREE.Mesh[]).filter((mesh) => mesh.geometry.type === 'CylinderGeometry')
const leavesOf = (bush: THREE.Group): THREE.Mesh[] => (bush.children as THREE.Mesh[]).filter((mesh) => mesh.geometry.type === 'IcosahedronGeometry')
const footOf = (limb: THREE.Mesh): number => (limb.geometry as THREE.CylinderGeometry).parameters.radiusBottom
const placesOf = (bush: THREE.Group): number[][] => bush.children.map((child) => child.position.toArray())

describe('laurelBush', () => {
  it('il se balance dans le vent, peu (il est haut) ; ses touffes sont un feuillage qui reste', () => {
    const bush = laurelBush(11)
    expect(bush.userData.sway).toBe(0.02)
    expect(new Set(leavesOf(bush).map((leaf) => leaf.userData.season))).toEqual(new Set(['evergreen']))
  })

  it('la même graine donne le même laurier, une autre un laurier différent', () => {
    expect(placesOf(laurelBush(11))).toEqual(placesOf(laurelBush(11)))
    expect(placesOf(laurelBush(11))).not.toEqual(placesOf(laurelBush(12)))
  })

  it('une cépée de sept ou huit gros troncs espacés au pied, et un tronc central qui file à 6,90 m', () => {
    const bush = laurelBush(11)
    const limbs = limbsOf(bush)
    expect(new Set(limbs.map((limb) => limb.material)).size).toBe(1)
    // Le pied de chaque tronc : un tronçon de 10 cm de rayon.
    const trunks = limbs.filter((limb) => footOf(limb) === 0.1)
    expect([7, 8]).toContain(trunks.length)
    // Le tronc central : six tronçons, du pied au sommet.
    const leader = limbs.filter((limb) => [0.09, 0.077, 0.064, 0.051, 0.038, 0.025].some((radius) => Math.abs(footOf(limb) - radius) < 1e-9) && Math.hypot(limb.position.x, limb.position.z) < 0.2)
    expect(leader.length).toBeGreaterThanOrEqual(6)
    const leaves = leavesOf(bush)
    // Le toupet du sommet est à 6,90 m ; les touffes posées après lui (le devant, le dessus) restent accrochées aux branches, plus bas ou à peine plus haut.
    expect(leaves.some((leaf) => Math.abs(leaf.position.y - 6.9) < 1e-9)).toBe(true)
    expect(Math.max(...leaves.map((leaf) => leaf.position.y))).toBeLessThan(7.5)
  })

  it('un feuillage sombre en petites touffes un peu écrasées, nu en bas', () => {
    const leaves = leavesOf(laurelBush(11))
    expect(new Set(leaves.map((leaf) => (leaf.material as THREE.MeshStandardMaterial).color.getHex()))).toEqual(new Set([0x2f5d2c, 0x386b33, 0x274f26]))
    expect(new Set(leaves.map((leaf) => leaf.material)).size).toBe(3)
    for (const leaf of leaves) {
      expect(leaf.scale.y).toBeGreaterThanOrEqual(0.8)
      expect(leaf.scale.y).toBeLessThan(1.1)
      expect((leaf.geometry as THREE.IcosahedronGeometry).parameters.radius).toBeLessThan(0.21)
    }
    expect(leaves.length).toBeGreaterThan(300)
    // Les troncs sont nus en bas : pas de feuilles sous 90 cm.
    expect(Math.min(...leaves.map((leaf) => leaf.position.y))).toBeGreaterThan(0.9)
  })

  it('trois troncs se dédoublent dès le bas, d’un côté ou de l’autre selon le hasard : toujours trois seconds troncs, quelle que soit la graine', () => {
    const sides = new Set<number>()
    for (let seed = 1; seed <= 8; seed += 1) {
      const limbs = limbsOf(laurelBush(seed))
      // Le pied d'un second tronc : un tronçon de 7,5 cm de rayon.
      const seconds = limbs.filter((limb) => footOf(limb) === 0.075)
      expect(seconds).toHaveLength(3)
      // Il part du premier tronçon de son tronc, entre 40 et 70 % de sa hauteur : son milieu est au-dessus du sol.
      for (const second of seconds) expect(second.position.y).toBeGreaterThan(0.1)
      // De quel côté il part, vu du tronc dont il sort (le signe du produit vectoriel de leurs deux directions).
      const trunks = limbs.filter((limb) => footOf(limb) === 0.1)
      seconds.forEach((second, index) => {
        const trunk = trunks[index]
        sides.add(Math.sign(trunk.position.x * second.position.z - trunk.position.z * second.position.x))
      })
    }
    expect(sides.has(1)).toBe(true)
    expect(sides.has(-1)).toBe(true)
  })
})
