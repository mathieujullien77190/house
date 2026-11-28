import type * as THREE from 'three'
import { instancedIn, limbsIn, near, plainIn, tuftsIn } from '@/test/batched'
import { laurelBush, roundLaurel } from './laurel'

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

describe('laurelBush, ses verts et sa hauteur au choix', () => {
  it('`colors` : les verts de son feuillage ; `leaderTall` : la hauteur de son tronc du centre', () => {
    const pale = laurelBush(11, [0x7fb552, 0x8fc25a, 0x6aa548], 6.1)
    expect(instancedIn(pale).map((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex())).toEqual([0x7fb552, 0x8fc25a, 0x6aa548])
    // Le toupet du sommet descend avec le tronc du centre : à 6,10 m au lieu de 6,90 m.
    const leaves = tuftsIn(pale)
    expect(leaves.some((leaf) => near(leaf.at.y, 6.1))).toBe(true)
    expect(leaves.some((leaf) => near(leaf.at.y, 6.9))).toBe(false)
    // Plus court, le tronc du centre porte un peu moins de rameaux ; le reste du buisson est le même.
    const whole = limbsIn(laurelBush(11)).length
    expect(limbsIn(pale).length).toBeLessThanOrEqual(whole)
    expect(limbsIn(pale).length).toBeGreaterThan(whole - 20)
  })
})

describe('roundLaurel', () => {
  it('quatre maillages : le bois (cinq troncs courts, trois branches coudées chacun) et ses touffes par teinte, trois verts', () => {
    const laurel = roundLaurel(14, 1.25, 4.8)
    expect(laurel.children).toHaveLength(4)
    expect(plainIn(laurel)).toHaveLength(1)
    expect(instancedIn(laurel).map((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex())).toEqual([0x4a8a3c, 0x569a45, 0x3f7d34])
    const limbs = limbsIn(laurel)
    // Un tronc et deux tronçons par branche : 5 × (1 + 3 × 2).
    expect(limbs).toHaveLength(35)
    const trunks = limbs.filter((limb) => near(limb.thick, 0.1))
    expect(trunks).toHaveLength(5)
    for (const trunk of trunks) {
      expect(trunk.from.y).toBeCloseTo(0)
      expect(Math.hypot(trunk.from.x, trunk.from.z)).toBeCloseTo(0.15)
      expect(trunk.to.y).toBeGreaterThanOrEqual(0.7)
      expect(trunk.to.y).toBeLessThan(1.2)
    }
    expect(tuftsIn(laurel)).toHaveLength(230)
  })

  it('une couronne en ovale qui commence tout en bas : les touffes restent dans l’ovale (à 15 % près), du sol au sommet', () => {
    const [radius, tall] = [1.25, 4.8]
    const leaves = tuftsIn(roundLaurel(14, radius, tall))
    for (const leaf of leaves) {
      const share = Math.hypot(Math.hypot(leaf.at.x, leaf.at.z) / radius, (leaf.at.y - tall / 2) / (tall / 2))
      expect(share).toBeLessThanOrEqual(1.15 + 1e-6)
      expect(share).toBeGreaterThan(0.29)
      // Un peu écrasées, de 24 à 38 cm.
      expect(leaf.size.y / leaf.size.x).toBeCloseTo(0.8)
      expect(leaf.size.x).toBeGreaterThanOrEqual(0.24 - 1e-6)
      expect(leaf.size.x).toBeLessThan(0.38)
    }
    // Feuillue dès le pied, et jusqu'en haut.
    expect(Math.min(...leaves.map((leaf) => leaf.at.y))).toBeLessThan(tall * 0.2)
    expect(Math.max(...leaves.map((leaf) => leaf.at.y))).toBeGreaterThan(tall * 0.8)
  })

  it('`colors` et `tufts` : ses verts et le nombre de ses touffes ; `hollowBase` : moins de touffes basses serrées contre le tronc', () => {
    const dark = [0x2f5a35, 0x37663a, 0x284d30]
    const column = roundLaurel(163, 2, 6.5, dark, false, 150)
    expect(tuftsIn(column)).toHaveLength(150)
    expect(new Set(tuftsIn(column).map((leaf) => leaf.material.color.getHex()))).toEqual(new Set(dark))
    // Les touffes basses et proches du tronc, avec et sans `hollowBase`, sur plusieurs graines.
    const crowded = (hollowBase: boolean): number =>
      [151, 152, 153, 154].reduce((sum, seed) => sum + tuftsIn(roundLaurel(seed, 1.2, 4, dark, hollowBase)).filter((leaf) => leaf.at.y < 4 * 0.45 && Math.hypot(leaf.at.x, leaf.at.z) < 1.2 * 0.5).length, 0)
    expect(crowded(true)).toBeLessThan(crowded(false) / 2)
    // Le nombre de touffes ne change pas : celles du pied sont tirées de nouveau, ailleurs.
    expect(tuftsIn(roundLaurel(151, 1.2, 4, dark, true))).toHaveLength(230)
  })

  it('la même graine donne le même laurier, une autre un laurier différent', () => {
    expect(shapeOf(roundLaurel(14, 1.25, 4.8))).toEqual(shapeOf(roundLaurel(14, 1.25, 4.8)))
    expect(shapeOf(roundLaurel(14, 1.25, 4.8))).not.toEqual(shapeOf(roundLaurel(15, 1.25, 4.8)))
  })
})
