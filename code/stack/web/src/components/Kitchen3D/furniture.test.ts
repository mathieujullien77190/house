import type * as THREE from 'three'
import { ENTRY, KITCHEN, LAYOUT, ROOM } from './constants'
import { buildFurniture } from './furniture'
import { BULB_OFF } from './primitives'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('buildFurniture', () => {
  const root = buildFurniture()
  root.updateMatrixWorld(true)

  it('le séjour, la salle à manger, le bureau, la bibliothèque, le coin repas et l’entrée', () => {
    expect(root.children).toHaveLength(14)
    const [sofa, table, armchair] = root.children
    expect(sofa.position.toArray()).toEqual([LAYOUT.sofa.x, 0, LAYOUT.sofa.z])
    // Le canapé regarde l'ouest (la télé), le fauteuil le sud.
    expect(sofa.rotation.y).toBeCloseTo(Math.PI)
    expect(table.position.toArray()).toEqual([LAYOUT.coffee.x, 0, LAYOUT.coffee.z])
    expect(armchair.position.toArray()).toEqual([LAYOUT.armchair.x, 0, LAYOUT.armchair.z])
    expect(armchair.rotation.y).toBeCloseTo(-Math.PI / 2)
    // La bibliothèque : trois maillages de copies.
    expect(root.children[7].children.map((child) => (child as THREE.InstancedMesh).isInstancedMesh)).toEqual([true, true, true])
  })

  it('la table ronde et ses quatre chaises tournées vers elle', () => {
    const dining = root.children[5]
    expect(dining.position.toArray()).toEqual([LAYOUT.dining.x, 0, LAYOUT.dining.z])
    const chairs = dining.children.filter((child) => child.type === 'Group')
    expect(chairs).toHaveLength(4)
    for (const chair of chairs) {
      expect(Math.hypot(chair.position.x, chair.position.z)).toBeCloseTo(0.78)
      // Son devant (+z, tourné) pointe vers le centre de la table.
      expect(Math.sin(chair.rotation.y)).toBeCloseTo(-chair.position.x / 0.78)
      expect(Math.cos(chair.rotation.y)).toBeCloseTo(-chair.position.z / 0.78)
    }
  })

  it('tout tient dans la pièce (et ses niches)', () => {
    const meshes = meshesOf(root).filter((mesh) => !(mesh as THREE.InstancedMesh).isInstancedMesh)
    expect(meshes.length).toBeGreaterThan(200)
    for (const mesh of meshes) {
      const { x, y, z } = mesh.getWorldPosition(mesh.position.clone())
      expect(x).toBeGreaterThanOrEqual(ROOM.xMin - 0.05)
      expect(x).toBeLessThanOrEqual(ROOM.xMax + 0.05)
      expect(z).toBeGreaterThanOrEqual(ROOM.zMin - 0.05)
      expect(z).toBeLessThanOrEqual(ROOM.zMax + 0.05)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThanOrEqual(ROOM.height)
    }
  })

  it('huit ampoules de luminaires, éteintes, chacune avec son matériau', () => {
    const bulbs = meshesOf(root).filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs).toHaveLength(8)
    expect(new Set(bulbs.map((bulb) => bulb.material)).size).toBe(8)
    for (const bulb of bulbs) expect((bulb.material as THREE.MeshBasicMaterial).color.getHex()).toBe(BULB_OFF)
    const places = bulbs.map((bulb) => bulb.getWorldPosition(bulb.position.clone()))
    // Le bureau (deux lampes et le plafonnier), le salon, le coin repas, le bar (deux), l'entrée.
    const near = (x: number, z: number) => places.filter((place) => Math.hypot(place.x - x, place.z - z) < 0.01).length
    expect(near(-3.7, 0.9)).toBe(1)
    expect(near(LAYOUT.bistro.x - 0.3, LAYOUT.bistro.z)).toBe(1)
    expect(near(KITCHEN.xMin - 0.09, 0.4)).toBe(1)
    expect(near(KITCHEN.xMin - 0.09, 1)).toBe(1)
    expect(near((ENTRY.x + ENTRY.northX) / 2, (KITCHEN.zMax + ENTRY.doorZ) / 2)).toBe(1)
    expect(near(LAYOUT.desk.x, LAYOUT.desk.z - 0.7)).toBe(1)
    expect(near(LAYOUT.desk.x - 0.75, LAYOUT.desk.z - 0.12)).toBe(1)
    expect(near(LAYOUT.desk.x + 0.75, LAYOUT.desk.z - 0.12)).toBe(1)
  })

  it('le cellier a ses cinq étagères de quatre bocaux, les mêmes à chaque ouverture', () => {
    const jars = (group: THREE.Object3D) =>
      meshesOf(group)
        .filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && Math.abs(mesh.position.z - (KITCHEN.zMax + 0.26)) < 0.1 && Math.abs(mesh.position.x - LAYOUT.cellar.x) < 0.5)
        .map((mesh) => mesh.position.toArray())
    const first = jars(root.children[10])
    expect(first).toHaveLength(20)
    expect(jars(buildFurniture().children[10])).toEqual(first)
  })
})
