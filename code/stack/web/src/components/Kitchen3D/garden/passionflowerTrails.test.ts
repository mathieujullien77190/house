import * as THREE from 'three'
import { CAGE_HEIGHT } from './constants'
import { SITE } from './layout'
import { passionflower } from './plants'

// Un tirage truqué : toujours le même grand nombre, pour que les chemins de feuilles dérivent tous du même côté et sortent de la cage.
const h = vi.hoisted(() => ({ value: 0.999 }))
vi.mock('@/components/Kitchen3D/primitives', async (original) => ({ ...(await original<typeof import('@/components/Kitchen3D/primitives')>()), seeded: () => () => h.value }))

describe('passionflower : les chemins de feuilles sur les toits', () => {
  it('un chemin s’arrête dès qu’il sort de son toit : aucune feuille au-delà de la cage', () => {
    const group = new THREE.Group()
    passionflower(group)
    const leaves = group.children.find((child) => (child as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh
    const matrix = new THREE.Matrix4()
    const at = new THREE.Vector3()
    for (let index = 0; index < leaves.count; index += 1) {
      leaves.getMatrixAt(index, matrix)
      at.setFromMatrixPosition(matrix)
      expect(at.x).toBeLessThanOrEqual(SITE.cageX2 + 0.2)
      expect(at.y).toBeLessThanOrEqual(CAGE_HEIGHT + 0.2)
      expect(at.z).toBeLessThanOrEqual(SITE.cageZ2 + 0.2)
    }
    expect(leaves.count).toBeGreaterThanOrEqual(0)
  })
})
