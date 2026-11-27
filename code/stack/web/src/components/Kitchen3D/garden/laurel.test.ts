import type * as THREE from 'three'
import { instancedIn, limbsIn, near, plainIn, tuftsIn } from '@/test/batched'
import { laurelBush } from './laurel'

/** Tout ce qui fait la forme du laurier : les sommets de son bois et les places de ses touffes. */
const shapeOf = (bush: THREE.Group): number[][] => [...plainIn(bush).map((mesh) => Array.from(mesh.geometry.attributes.position.array)), ...instancedIn(bush).map((mesh) => Array.from(mesh.instanceMatrix.array))]

describe('laurelBush', () => {
  it('quatre maillages en tout : le bois, et ses touffes par teinte, trois verts sombres', () => {
    const bush = laurelBush(11)
    expect(plainIn(bush)).toHaveLength(1)
    expect(instancedIn(bush)).toHaveLength(3)
    expect(bush.children).toHaveLength(4)
    expect(instancedIn(bush).map((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex())).toEqual([0x2f5d2c, 0x386b33, 0x274f26])
  })

  it('la même graine donne le même laurier, une autre un laurier différent', () => {
    expect(shapeOf(laurelBush(11))).toEqual(shapeOf(laurelBush(11)))
    expect(shapeOf(laurelBush(11))).not.toEqual(shapeOf(laurelBush(12)))
  })

  it('une cépée de sept ou huit gros troncs espacés au pied, et un tronc central qui file à 6,90 m', () => {
    const bush = laurelBush(11)
    const limbs = limbsIn(bush)
    expect(new Set(limbs.map((limb) => limb.material)).size).toBe(1)
    // Le pied de chaque tronc : un tronçon de 10 cm de rayon.
    const trunks = limbs.filter((limb) => near(limb.thick, 0.1))
    expect([7, 8]).toContain(trunks.length)
    // Le tronc central : six tronçons, du pied au sommet.
    const leader = limbs.filter((limb) => [0.09, 0.077, 0.064, 0.051, 0.038, 0.025].some((radius) => near(limb.thick, radius)) && Math.hypot(limb.mid.x, limb.mid.z) < 0.2)
    expect(leader.length).toBeGreaterThanOrEqual(6)
    const leaves = tuftsIn(bush)
    // Le toupet du sommet est à 6,90 m ; les touffes posées après lui (le devant, le dessus) restent accrochées aux branches, plus bas ou à peine plus haut.
    expect(leaves.some((leaf) => near(leaf.at.y, 6.9))).toBe(true)
    expect(Math.max(...leaves.map((leaf) => leaf.at.y))).toBeLessThan(7.5)
  })

  it('un feuillage sombre en petites touffes un peu écrasées, nu en bas', () => {
    const leaves = tuftsIn(laurelBush(11))
    expect(new Set(leaves.map((leaf) => leaf.material.color.getHex()))).toEqual(new Set([0x2f5d2c, 0x386b33, 0x274f26]))
    expect(new Set(leaves.map((leaf) => leaf.material)).size).toBe(3)
    for (const leaf of leaves) {
      expect(leaf.size.y / leaf.size.x).toBeGreaterThanOrEqual(0.8 - 1e-6)
      expect(leaf.size.y / leaf.size.x).toBeLessThan(1.1)
      expect(leaf.size.x).toBeLessThan(0.21)
    }
    expect(leaves.length).toBeGreaterThan(300)
    // Les troncs sont nus en bas : pas de feuilles sous 90 cm.
    expect(Math.min(...leaves.map((leaf) => leaf.at.y))).toBeGreaterThan(0.9)
  })

  it('trois troncs se dédoublent dès le bas, d’un côté ou de l’autre selon le hasard : toujours trois seconds troncs, quelle que soit la graine', () => {
    const sides = new Set<number>()
    for (let seed = 1; seed <= 8; seed += 1) {
      const limbs = limbsIn(laurelBush(seed))
      // Le pied d'un second tronc : un tronçon de 7,5 cm de rayon.
      const seconds = limbs.filter((limb) => near(limb.thick, 0.075))
      expect(seconds).toHaveLength(3)
      // Il part du premier tronçon de son tronc, entre 40 et 70 % de sa hauteur : son milieu est au-dessus du sol.
      for (const second of seconds) expect(second.mid.y).toBeGreaterThan(0.1)
      // De quel côté il part, vu du tronc dont il sort (le signe du produit vectoriel de leurs deux directions).
      const trunks = limbs.filter((limb) => near(limb.thick, 0.1))
      seconds.forEach((second, index) => {
        const trunk = trunks[index]
        sides.add(Math.sign(trunk.mid.x * second.mid.z - trunk.mid.z * second.mid.x))
      })
    }
    expect(sides.has(1)).toBe(true)
    expect(sides.has(-1)).toBe(true)
  })
})
