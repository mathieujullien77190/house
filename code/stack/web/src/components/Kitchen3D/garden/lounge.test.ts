import * as THREE from 'three'
import { DECK } from './constants'
import { SITE } from './layout'
import { lounge } from './lounge'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('lounge', () => {
  const build = () => {
    const group = new THREE.Group()
    lounge(group)
    return group.children[0] as THREE.Group
  }

  it('posé sur la terrasse en ipé, au droit du laurier : un canapé, une table basse et deux fauteuils', () => {
    const set = build()
    expect(set.position.toArray()).toEqual([SITE.treeX, DECK.top, SITE.cageZ1 - 0.4 - DECK.long])
    expect(set.children).toHaveLength(4)
    const [sofa, low, left, right] = set.children
    // Le canapé : trois places (une assise à lattes, quatre pieds, l'arceau de corde d'un seul maillage, deux coussins par place).
    expect(meshesOf(sofa)).toHaveLength(12)
    expect((meshesOf(sofa)[0].geometry as THREE.BoxGeometry).parameters.width).toBeCloseTo(3 * 0.6 + 0.12)
    // Les fauteuils : une place.
    for (const chair of [left, right]) {
      expect(meshesOf(chair)).toHaveLength(8)
      expect((meshesOf(chair)[0].geometry as THREE.BoxGeometry).parameters.width).toBeCloseTo(0.6 + 0.12)
    }
    // La table basse : un plateau de seize lattes, son cadre et ses quatre pieds de métal, un peu en retrait.
    expect(meshesOf(low)).toHaveLength(25)
    expect(low.position.z).toBe(0.5)
  })

  it('le canapé tourne le dos à la cage ; les fauteuils se font face aux deux bouts de la table', () => {
    const [sofa, , left, right] = build().children
    const frontOf = (seat: THREE.Object3D) => new THREE.Vector3(0, 0, 1).applyEuler(seat.rotation)
    // La cage est du côté des z croissants : le canapé, devant elle, regarde vers −z (le jardin).
    expect(sofa.position.z).toBe(1.4)
    expect(frontOf(sofa).z).toBeCloseTo(-1)
    expect(left.position.x).toBe(-1.25)
    expect(right.position.x).toBe(1.25)
    expect(frontOf(left).x).toBeCloseTo(1)
    expect(frontOf(right).x).toBeCloseTo(-1)
  })

  it('métal crème, corde, lattes claires et coussins beiges : quatre matériaux pour tout le salon', () => {
    const meshes = meshesOf(build())
    expect(meshes).toHaveLength(53)
    const colors = new Map<THREE.Material, number>()
    for (const mesh of meshes) colors.set(mesh.material as THREE.Material, (colors.get(mesh.material as THREE.Material) ?? 0) + 1)
    // Trois arceaux de corde (un par siège), vingt et une lattes, dix coussins (deux par place), le reste en métal.
    expect([...colors.values()].sort((a, b) => a - b)).toEqual([3, 10, 19, 21])
    // Les coussins de dossier sont un peu inclinés.
    expect(meshes.filter((mesh) => mesh.rotation.x === -0.14)).toHaveLength(5)
  })
})
