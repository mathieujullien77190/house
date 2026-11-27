import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { ENTRY, KITCHEN, LAYOUT, ROOM } from '@/components/Kitchen3D/constants'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { corridorDoor, entry } from './entry'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters

describe('corridorDoor', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la porte du couloir, ouverte : l’huisserie autour du passage et le battant rabattu dans le salon', () => {
    const m = furnitureMaterials()
    const meshes = meshesOf(corridorDoor(m))
    const { x, width } = LAYOUT.door
    expect(meshes).toHaveLength(6)
    expect(meshes.slice(0, 2).map((post) => post.position.x)).toEqual([x - width / 2 - 0.025, x + width / 2 + 0.025].map((at) => expect.closeTo(at)))
    for (const post of meshes.slice(0, 3)) expect(post.position.z).toBe(ROOM.zMin)
    // Le battant : d'équerre au mur, ses gonds côté cuisine.
    const leaf = meshes[3]
    expect(sizeOf(leaf).depth).toBeCloseTo(width - 0.02)
    expect(leaf.position.x).toBeCloseTo(x + width / 2 - 0.02)
    expect(leaf.position.z).toBeGreaterThan(ROOM.zMin)
    expect(meshes.slice(4).map((handle) => handle.material)).toEqual([m.shutter, m.shutter])
  })
})

describe('entry', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la porte d’entrée blanche : quatre panneaux et un hublot en demi-lune de chaque côté', () => {
    const m = furnitureMaterials()
    const meshes = meshesOf(entry(m))
    const { doorX, doorZ, doorWidth, doorHeight } = ENTRY
    expect(sizeOf(meshes[0])).toMatchObject({ width: doorWidth, height: doorHeight })
    expect(meshes[0].position.toArray()).toEqual([doorX, doorHeight / 2, doorZ - 0.03])
    const moons = meshes.filter((mesh) => mesh.geometry.type === 'CircleGeometry')
    expect(moons).toHaveLength(2)
    expect(moons[0].position.z).toBeLessThan(doorZ - 0.05)
    expect(moons[1].position.z).toBeGreaterThan(doorZ)
    const panels = meshes.filter((mesh) => sizeOf(mesh).width === 0.26 && sizeOf(mesh).depth === 0.008)
    expect(panels).toHaveLength(8)
  })

  it('le placard encastré : sept façades à bouton noir, et six classeurs dans la colonne', () => {
    const m = furnitureMaterials()
    const meshes = meshesOf(entry(m))
    const knobs = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && (mesh.geometry as THREE.CylinderGeometry).parameters.radiusTop === 0.012)
    expect(knobs).toHaveLength(7)
    const doorsZ = ENTRY.doorZ - 0.5
    // Les portes doubles ont leurs boutons au milieu, côte à côte ; les autres au milieu de la façade.
    expect(knobs.map((knob) => knob.position.z)).toEqual([doorsZ - 0.03, doorsZ + 0.03, doorsZ, doorsZ, doorsZ, doorsZ - 0.03, doorsZ + 0.03].map((at) => expect.closeTo(at)))
    // En hauteur : en haut des portes basses, au milieu des tiroirs, en bas des portes hautes.
    expect(knobs.map((knob) => knob.position.y)).toEqual([0.68, 0.68, 0.86, 1.04, 1.66, 1.84, 1.84].map((at) => expect.closeTo(at)))
    const binders = meshes.filter((mesh) => sizeOf(mesh).height === 0.28 && sizeOf(mesh).depth === 0.06)
    expect(binders).toHaveLength(6)
    expect(new Set(binders.map((binder) => (binder.material as THREE.MeshStandardMaterial).color.getHex())).size).toBe(5)
  })

  it('la suspension de l’entrée porte le nom de sa lampe ; le poteau, puis le claustra de treize lames sur son muret', () => {
    const m = furnitureMaterials()
    const meshes = meshesOf(entry(m))
    const { x, northX, doorZ, postZ, claustraZ, wallZ, muret } = ENTRY
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['entrée'])
    expect(bulbs[0].position.toArray()).toEqual([(x + northX) / 2, 1.98, (KITCHEN.zMax + doorZ) / 2])
    const post = meshes.find((mesh) => sizeOf(mesh).height === ROOM.height && sizeOf(mesh).width === 0.1) as THREE.Mesh
    expect(post.position.toArray()).toEqual([x, ROOM.height / 2, postZ])
    const slats = meshes.filter((mesh) => sizeOf(mesh).width === 0.08 && sizeOf(mesh).depth === 0.02)
    expect(slats).toHaveLength(13)
    expect(slats[0].position.z).toBeCloseTo(claustraZ + 0.03)
    expect(slats[12].position.z).toBeCloseTo(wallZ - 0.03)
    for (const slat of slats) {
      expect(slat.material).toBe(m.woodLight)
      // Du muret jusqu'à 12 cm du plafond.
      expect(slat.position.y - sizeOf(slat).height / 2).toBeCloseTo(muret + 0.02)
    }
  })
})
