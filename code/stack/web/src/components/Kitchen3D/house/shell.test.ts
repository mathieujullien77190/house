import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { KITCHEN, MAST_CAMERA, ROOM, TILES } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import { buildShell } from './shell'

const built = () => {
  const maps = kitchenMaps()
  const materials = kitchenMaterials(maps)
  return { materials, group: buildShell(materials, maps) }
}
const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('buildShell', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('tout le gros œuvre dans un seul groupe : dix plafonds de lambris, deux parquets, le grand posé après les murs', () => {
    const { group, materials } = built()
    const planes = (group.children as THREE.Mesh[]).filter((child) => child.geometry?.type === 'PlaneGeometry')
    // Le salon, la bande du claustra, l'entrée, la cuisine, puis les quatre pièces du reste de la maison, le couloir et le sas.
    const ceilings = planes.filter((plane) => plane.position.y === ROOM.height)
    expect(ceilings).toHaveLength(10)
    for (const ceiling of ceilings) expect(ceiling.material).toBe(materials.lambris)
    // Les petites lames de la salle de bain, puis le parquet de tout le reste, d'un seul maillage.
    const parquets = (group.children as THREE.InstancedMesh[]).filter((child) => child.isInstancedMesh)
    expect(parquets).toHaveLength(2)
    expect(parquets[0].count).toBeGreaterThan(80)
    expect(parquets[1].count).toBeGreaterThan(300)
    // Il couvre toutes les pièces inscrites : du mur des baies au mur des fenêtres de la cuisine, et jusqu'au fond du sas.
    const reach = new THREE.Box3()
    const matrix = new THREE.Matrix4()
    for (let index = 0; index < parquets[1].count; index += 1) {
      parquets[1].getMatrixAt(index, matrix)
      reach.expandByPoint(new THREE.Vector3().setFromMatrixPosition(matrix))
    }
    expect(reach.min.x).toBeLessThan(ROOM.xMin + 1)
    expect(reach.max.x).toBeGreaterThan(KITCHEN.xMax - 1)
    expect(reach.max.z).toBeGreaterThan(ROOM.zMax)
  })

  it('il porte aussi le décor de la cuisine : la crédence, les objets du plan de travail, la suspension, et la caméra du mât', () => {
    const { group } = built()
    const tiles = (group.children as THREE.Mesh[]).filter((child) => child.geometry?.type === 'PlaneGeometry' && (child.geometry as THREE.PlaneGeometry).parameters.height === TILES.height)
    expect(tiles).toHaveLength(2)
    // Trois luminaires : le plafonnier du couloir, la lanterne de l'entrée (que la maison ne nomme pas), puis la suspension de la cuisine (posée en dernier).
    const bulbs = meshesOf(group).filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['couloir', undefined, 'cuisine 1'])
    expect(group.children.at(-1)?.type).toBe('Mesh')
    expect(group.children.filter((child) => child.userData.camera === MAST_CAMERA)).toHaveLength(1)
    // Le même gros œuvre à chaque ouverture.
    expect(buildShell(kitchenMaterials(kitchenMaps()), kitchenMaps()).children).toHaveLength(group.children.length)
  })
})
