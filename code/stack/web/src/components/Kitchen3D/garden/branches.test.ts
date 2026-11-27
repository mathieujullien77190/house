import * as THREE from 'three'
import { seeded } from '@/components/Kitchen3D/primitives'
import { berriesOf, blossomOf, limbOf, sprinkleOf, tuftOf } from './branches'

describe('limbOf', () => {
  it('un tronçon de bois entre deux points, plus fin au bout', () => {
    const group = new THREE.Group()
    const bark = new THREE.MeshStandardMaterial()
    const from = new THREE.Vector3(1, 0, 0)
    const to = new THREE.Vector3(1, 2, 2)
    limbOf(group, bark)(from, to, 0.1, 0.04)
    expect(group.children).toHaveLength(1)
    const piece = group.children[0] as THREE.Mesh
    expect(piece.material).toBe(bark)
    const { radiusTop, radiusBottom, height } = (piece.geometry as THREE.CylinderGeometry).parameters
    expect(radiusBottom).toBe(0.1)
    expect(radiusTop).toBe(0.04)
    expect(height).toBeCloseTo(Math.hypot(2, 2))
    expect(piece.position.toArray()).toEqual([1, 1, 1])
    // Son axe est tourné du pied vers le bout.
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(piece.quaternion)
    expect(axis.distanceTo(to.clone().sub(from).normalize())).toBeCloseTo(0)
  })
})

describe('tuftOf', () => {
  it('une touffe à facettes d’une des teintes données, à sa place, tournée au hasard', () => {
    const group = new THREE.Group()
    const tints = [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()]
    const tuft = tuftOf(group, seeded(3), tints)
    for (let index = 0; index < 12; index += 1) tuft(new THREE.Vector3(index, 2, 0), 0.2)
    const leaves = group.children as THREE.Mesh[]
    expect(leaves).toHaveLength(12)
    expect(leaves[4].position.toArray()).toEqual([4, 2, 0])
    expect((leaves[0].geometry as THREE.IcosahedronGeometry).parameters.radius).toBe(0.2)
    // Les deux teintes sortent, et aucune autre.
    expect(new Set(leaves.map((leaf) => leaf.material))).toEqual(new Set(tints))
    // Sans `squash`, elle n'est pas écrasée.
    for (const leaf of leaves) expect(leaf.scale.toArray()).toEqual([1, 1, 1])
    expect(new Set(leaves.map((leaf) => leaf.rotation.x)).size).toBe(12)
  })

  it('avec `squash`, elle est écrasée en hauteur seulement, entre le premier nombre et leur somme', () => {
    const group = new THREE.Group()
    const tuft = tuftOf(group, seeded(3), [new THREE.MeshStandardMaterial()], [0.75, 0.2])
    for (let index = 0; index < 12; index += 1) tuft(new THREE.Vector3(0, 0, 0), 0.2)
    for (const leaf of group.children) {
      expect(leaf.scale.x).toBe(1)
      expect(leaf.scale.z).toBe(1)
      expect(leaf.scale.y).toBeGreaterThanOrEqual(0.75)
      expect(leaf.scale.y).toBeLessThan(0.95)
    }
  })
})

describe('tuftOf : la marque de saison', () => {
  it('sans `key`, la touffe n’est pas marquée ; avec, elle porte sa marque', () => {
    const group = new THREE.Group()
    const tints = [new THREE.MeshStandardMaterial()]
    tuftOf(group, seeded(3), tints)(new THREE.Vector3(), 0.2)
    tuftOf(group, seeded(3), tints, undefined, 'leaves')(new THREE.Vector3(), 0.2)
    tuftOf(group, seeded(3), tints, [0.8, 0.3], 'evergreen')(new THREE.Vector3(), 0.2)
    expect(group.children.map((child) => child.userData.season)).toEqual([undefined, 'leaves', 'evergreen'])
    // La marque ne change pas le tirage : la même touffe, tournée pareil.
    expect(group.children[1].rotation.toArray()).toEqual(group.children[0].rotation.toArray())
  })
})

describe('blossomOf', () => {
  const tufts: [THREE.Vector3, number][] = [
    [new THREE.Vector3(0, 2, 0), 0.2],
    [new THREE.Vector3(1, 3, -1), 0.25],
  ]
  const placesOf = (mesh: THREE.InstancedMesh): THREE.Vector3[] =>
    Array.from({ length: mesh.count }, (_, index) => {
      const matrix = new THREE.Matrix4()
      mesh.getMatrixAt(index, matrix)
      return new THREE.Vector3().setFromMatrixPosition(matrix)
    })

  it('un seul maillage de petites fleurs à facettes, `per` par touffe, sur son pourtour, marqué du printemps', () => {
    const blossom = blossomOf(tufts, 0xfff3f7, 9, 4)
    expect(blossom.isInstancedMesh).toBe(true)
    expect(blossom.count).toBe(8)
    expect(blossom.userData.season).toBe('blossom')
    expect(blossom.geometry.type).toBe('OctahedronGeometry')
    const material = blossom.material as THREE.MeshStandardMaterial
    expect(material.color.getHex()).toBe(0xfff3f7)
    expect(material.flatShading).toBe(true)
    placesOf(blossom).forEach((at, index) => {
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
  it('un seul maillage de petites boules de ce rayon et de cette couleur, aux places données, marqué de sa saison', () => {
    const places = [new THREE.Vector3(1, 2, 3), new THREE.Vector3(-1, 0.5, 2)]
    const berries = berriesOf(places, 0.02, 0xb3122a, 'cherries')
    expect(berries.count).toBe(2)
    expect(berries.userData.season).toBe('cherries')
    expect((berries.geometry as THREE.SphereGeometry).parameters.radius).toBe(0.02)
    expect((berries.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xb3122a)
    const matrix = new THREE.Matrix4()
    berries.getMatrixAt(1, matrix)
    expect(new THREE.Vector3().setFromMatrixPosition(matrix).toArray()).toEqual([-1, 0.5, 2])
    expect(berriesOf([], 0.01, 0x000000, 'harvest').count).toBe(0)
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
