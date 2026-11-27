import * as THREE from 'three'
import { seeded } from '@/components/Kitchen3D/primitives'
import { copiesOf, limbsOf } from '@/test/batched'
import { berriesOf, blossomOf, fruitsOf, piecesOf, sprinkleOf, tuftOf, tuftsOf, woodOf } from './branches'

describe('piecesOf', () => {
  it('des morceaux d’un même matériau, chacun à sa place, fondus en un seul maillage', () => {
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial()
    const pieces = piecesOf(material)
    pieces.add(new THREE.BoxGeometry(1, 1, 1), new THREE.Matrix4().makeTranslation(2, 0, 0))
    pieces.add(new THREE.BoxGeometry(1, 1, 1), new THREE.Matrix4().makeTranslation(-2, 3, 0))
    const [mesh] = pieces.grow(group)
    expect(group.children).toEqual([mesh])
    expect(mesh.material).toBe(material)
    expect(mesh.userData).toEqual({})
    // Deux pavés : deux fois 24 sommets, aux places données.
    expect(mesh.geometry.attributes.position.count).toBe(48)
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox as THREE.Box3
    expect(box.min.toArray()).toEqual([-2.5, -0.5, -0.5])
    expect(box.max.toArray()).toEqual([2.5, 3.5, 0.5])
  })

  it('sans morceau, rien n’est ajouté', () => {
    const group = new THREE.Group()
    expect(piecesOf(new THREE.MeshStandardMaterial()).grow(group)).toEqual([])
    expect(group.children).toHaveLength(0)
  })
})

describe('woodOf', () => {
  it('un tronçon de bois entre deux points, plus fin au bout ; tous les tronçons font un seul maillage', () => {
    const group = new THREE.Group()
    const bark = new THREE.MeshStandardMaterial()
    const from = new THREE.Vector3(1, 0, 0)
    const to = new THREE.Vector3(1, 2, 2)
    const wood = woodOf(bark)
    wood.limb(from, to, 0.1, 0.04)
    wood.limb(to, new THREE.Vector3(1, 3, 2), 0.04, 0.02)
    const [mesh] = wood.grow(group)
    expect(group.children).toEqual([mesh])
    expect(mesh.material).toBe(bark)
    const [piece, next] = limbsOf(mesh)
    expect(limbsOf(mesh)).toHaveLength(2)
    expect(piece.thick).toBeCloseTo(0.1)
    expect(piece.thin).toBeCloseTo(0.04)
    // Son axe va du pied vers le bout.
    expect(piece.from.distanceTo(from)).toBeCloseTo(0)
    expect(piece.to.distanceTo(to)).toBeCloseTo(0)
    expect(piece.mid.distanceTo(new THREE.Vector3(1, 1, 1))).toBeCloseTo(0)
    expect(next.to.y).toBeCloseTo(3)
    expect(woodOf(bark).grow(group)).toEqual([])
  })
})

describe('tuftsOf', () => {
  it('un maillage par teinte, quel que soit le nombre de touffes ; rien pour une teinte sans touffe', () => {
    const group = new THREE.Group()
    const tints = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()]
    const tufts = tuftsOf(tints)
    expect(tufts.tints).toBe(3)
    tufts.add(0, new THREE.Vector3(1, 2, 3), [0, 0, 0], [0.2, 0.1, 0.2])
    tufts.add(2, new THREE.Vector3(4, 5, 6), [0, Math.PI / 2, 0], [0.3, 0.3, 0.3])
    tufts.add(0, new THREE.Vector3(7, 8, 9), [0, 0, 0], [0.1, 0.1, 0.1])
    const meshes = tufts.grow(group)
    expect(group.children).toEqual(meshes)
    expect(meshes.map((mesh) => mesh.material)).toEqual([tints[0], tints[2]])
    expect(meshes.map((mesh) => mesh.count)).toEqual([2, 1])
    for (const mesh of meshes) {
      expect(mesh.isInstancedMesh).toBe(true)
      expect(mesh.userData).toEqual({})
      // Le même caillou de rayon 1 pour tous : c'est la copie qui lui donne sa taille.
      expect((mesh.geometry as THREE.IcosahedronGeometry).parameters).toMatchObject({ radius: 1, detail: 0 })
      expect(mesh.geometry).toBe(meshes[0].geometry)
    }
    const [first, third] = copiesOf(meshes[0])
    expect(first.at.toArray()).toEqual([1, 2, 3])
    expect(first.size.toArray()).toEqual([expect.closeTo(0.2), expect.closeTo(0.1), expect.closeTo(0.2)])
    expect(third.at.toArray()).toEqual([7, 8, 9])
    expect(copiesOf(meshes[1])[0].turn.angleTo(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)))).toBeCloseTo(0)
  })

  it('`detail` affine le caillou', () => {
    const tufts = tuftsOf([new THREE.MeshStandardMaterial()], 1)
    tufts.add(0, new THREE.Vector3(), [0, 0, 0], [1, 1, 1])
    const [mesh] = tufts.grow(new THREE.Group())
    expect((mesh.geometry as THREE.IcosahedronGeometry).parameters.detail).toBe(1)
  })
})

describe('tuftOf', () => {
  const grown = (seed: number, tints: THREE.Material[], squash?: [number, number]) => {
    const tufts = tuftsOf(tints)
    const tuft = tuftOf(seeded(seed), tufts, squash)
    for (let index = 0; index < 12; index += 1) tuft(new THREE.Vector3(index, 2, 0), 0.2)
    return tufts.grow(new THREE.Group()).flatMap(copiesOf)
  }

  it('une touffe à facettes d’une des teintes données, à sa place, tournée au hasard', () => {
    const tints = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()]
    const leaves = grown(3, tints)
    expect(leaves).toHaveLength(12)
    expect(leaves.map((leaf) => leaf.at.x).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    // Les deux teintes sortent, et aucune autre.
    expect(new Set(leaves.map((leaf) => leaf.material))).toEqual(new Set(tints))
    // Sans `squash`, elle n'est pas écrasée : son rayon dans les trois sens.
    for (const leaf of leaves) expect(leaf.size.toArray()).toEqual([expect.closeTo(0.2), expect.closeTo(0.2), expect.closeTo(0.2)])
    expect(new Set(leaves.map((leaf) => leaf.turn.x)).size).toBe(12)
    // Le même tirage donne les mêmes touffes.
    expect(grown(3, tints).map((leaf) => leaf.turn.toArray())).toEqual(leaves.map((leaf) => leaf.turn.toArray()))
  })

  it('avec `squash`, elle est écrasée en hauteur seulement, entre le premier nombre et leur somme', () => {
    for (const leaf of grown(3, [new THREE.MeshStandardMaterial()], [0.75, 0.2])) {
      expect(leaf.size.x).toBeCloseTo(0.2)
      expect(leaf.size.z).toBeCloseTo(0.2)
      expect(leaf.size.y).toBeGreaterThanOrEqual(0.2 * 0.75 - 1e-9)
      expect(leaf.size.y).toBeLessThan(0.2 * 0.95)
    }
  })
})

describe('blossomOf', () => {
  const tufts: [THREE.Vector3, number][] = [
    [new THREE.Vector3(0, 2, 0), 0.2],
    [new THREE.Vector3(1, 3, -1), 0.25],
  ]

  it('un seul maillage de petites fleurs à facettes, `per` par touffe, sur son pourtour', () => {
    const blossom = blossomOf(tufts, 0xfff3f7, 9, 4)
    expect(blossom.isInstancedMesh).toBe(true)
    expect(blossom.count).toBe(8)
    // Trop petites pour porter une ombre.
    expect(blossom.userData).toEqual({ noShadow: true })
    expect(blossom.geometry.type).toBe('OctahedronGeometry')
    const material = blossom.material as THREE.MeshStandardMaterial
    expect(material.color.getHex()).toBe(0xfff3f7)
    expect(material.flatShading).toBe(true)
    copiesOf(blossom).forEach(({ at }, index) => {
      const [tuft, size] = tufts[Math.floor(index / 4)]
      // À la surface de la touffe ou tout près, plutôt dessus que dessous.
      expect(at.distanceTo(tuft)).toBeLessThanOrEqual(size)
      expect(at.y).toBeGreaterThanOrEqual(tuft.y - size * 0.4 * 0.7 - 1e-9)
    })
  })

  it('le même tirage donne les mêmes fleurs, un autre des fleurs différentes', () => {
    const flat = (mesh: THREE.InstancedMesh): number[] => Array.from(mesh.instanceMatrix.array)
    expect(flat(blossomOf(tufts, 0xffffff, 9, 3))).toEqual(flat(blossomOf(tufts, 0xffffff, 9, 3)))
    expect(flat(blossomOf(tufts, 0xffffff, 9, 3))).not.toEqual(flat(blossomOf(tufts, 0xffffff, 10, 3)))
  })
})

describe('berriesOf', () => {
  it('un seul maillage de petites boules de ce rayon et de cette couleur, aux places données, sans ombre portée', () => {
    const places = [new THREE.Vector3(1, 2, 3), new THREE.Vector3(-1, 0.5, 2)]
    const berries = berriesOf(places, 0.02, 0xb3122a)
    expect(berries.count).toBe(2)
    expect(berries.userData).toEqual({ noShadow: true })
    expect((berries.geometry as THREE.SphereGeometry).parameters.radius).toBe(0.02)
    expect((berries.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xb3122a)
    expect(copiesOf(berries)[1].at.toArray()).toEqual([-1, 0.5, 2])
    expect(berriesOf([], 0.01, 0x000000).count).toBe(0)
  })
})

describe('fruitsOf', () => {
  it('un seul maillage de fruits à facettes de ce rayon et de cette couleur, aux places données, sans ombre portée', () => {
    const fruits = fruitsOf([new THREE.Vector3(1, 2, 3), new THREE.Vector3(-1, 0.5, 2)], 0.045, 0xc8402f)
    expect(fruits.count).toBe(2)
    expect(fruits.userData).toEqual({ noShadow: true })
    expect((fruits.geometry as THREE.IcosahedronGeometry).parameters).toMatchObject({ radius: 0.045, detail: 0 })
    const material = fruits.material as THREE.MeshStandardMaterial
    expect([material.color.getHex(), material.roughness, material.flatShading]).toEqual([0xc8402f, 0.6, true])
    expect(copiesOf(fruits)[1].at.toArray()).toEqual([-1, 0.5, 2])
    expect(fruitsOf([], 0.035, 0xe2a23a).count).toBe(0)
  })
})

describe('sprinkleOf', () => {
  it('une touffe tous les `every` mètres environ, chacune au bout d’une brindille partie du tronçon', () => {
    const limb = vi.fn<(from: THREE.Vector3, to: THREE.Vector3, thick: number, thin: number) => void>()
    const tuft = vi.fn<(at: THREE.Vector3) => void>()
    const from = new THREE.Vector3(0, 1, 0)
    const to = new THREE.Vector3(2, 1, 0)
    sprinkleOf(seeded(5), limb, tuft, 0.25, 0.5)(from, to)
    expect(limb).toHaveBeenCalledTimes(8)
    expect(tuft).toHaveBeenCalledTimes(8)
    limb.mock.calls.forEach(([base, at, thick, thin], index) => {
      // Le pied de la brindille est sur le tronçon, dans sa huitième part ; la touffe est à son bout, à moins de 30 cm.
      expect(base.y).toBe(1)
      expect(base.z).toBe(0)
      expect(base.x).toBeGreaterThan(index * 0.25)
      expect(base.x).toBeLessThan((index + 1) * 0.25)
      expect(at).toBe(tuft.mock.calls[index][0])
      expect(Math.abs(at.x - base.x)).toBeLessThanOrEqual(0.2)
      expect(Math.abs(at.y - base.y)).toBeLessThanOrEqual(0.15)
      expect([thick, thin]).toEqual([0.008, 0.005])
    })
  })

  it('un tronçon très court porte quand même une touffe', () => {
    const limb = vi.fn()
    const tuft = vi.fn()
    sprinkleOf(seeded(5), limb, tuft, 0.3, 0.2)(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0, 0))
    expect(limb).toHaveBeenCalledTimes(1)
    expect(tuft).toHaveBeenCalledTimes(1)
  })
})
