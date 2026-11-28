import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { ENTRY, LAYOUT, PATIO_DOOR, ROOM } from '@/components/Kitchen3D/constants'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { patioWindows, windowOnWall } from './windows'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const tagged = (root: THREE.Object3D, tag: string): THREE.Object3D[] => {
  const found: THREE.Object3D[] = []
  root.traverse((child) => {
    if (child.userData[tag] !== undefined) found.push(child)
  })
  return found
}

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters

describe('windowOnWall', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('une fenêtre à volet : cadre dans l’embrasure, deux vitres, lames à moitié descendues, marquées de leur volet', () => {
    const m = furnitureMaterials()
    const group = windowOnWall(m, ROOM.xMin, 1, 2, 1, 1.1, 1.05, undefined, 'pc')
    // Sa face ressort d'un centimètre dans la pièce (cadre de 7 cm).
    expect(group.position.x).toBeCloseTo(ROOM.xMin - 0.025)
    expect(group.position.y).toBeCloseTo(1.05 + 0.55)
    expect(group.position.z).toBe(2)
    // Quatre montants de cadre, une séparation (deux vitres par défaut), la vitre, le groupe des lames.
    expect(group.children).toHaveLength(7)
    const glass = group.children[5] as THREE.Mesh
    expect(glass.material).toBe(m.glass)
    expect(glass.rotation.y).toBeCloseTo(Math.PI / 2)
    const slats = group.children[6]
    expect(slats.userData).toEqual({ shutter: 'pc', area: expect.closeTo(1.1) })
    expect(slats.visible).toBe(true)
    // Des lames d'environ 5 cm qui remplissent exactement la hauteur de la vitre (1 m) : vingt, la moitié haute montrée.
    expect(slats.children).toHaveLength(20)
    expect(slats.children.filter((slat) => slat.visible)).toHaveLength(10)
    expect(slats.children[0].visible).toBe(true)
    expect(slats.children[19].visible).toBe(false)
    expect(slats.children[0].position.y).toBeCloseTo(0.5 - 0.025)
    expect(slats.children[19].position.y).toBeCloseTo(-0.5 + 0.025)
    for (const slat of slats.children) expect((slat as THREE.Mesh).material).toBe(m.slat)
    // Une lame : un profil et une âme fondus en une géométrie ; l'âme dépasse le pas (5 cm), pour qu'aucun jour ne passe entre deux lames.
    const shape = (slats.children[0] as THREE.Mesh).geometry
    expect(shape.type).toBe('BufferGeometry')
    shape.computeBoundingBox()
    const size = (shape.boundingBox as THREE.Box3).getSize(new THREE.Vector3())
    expect(size.y).toBeCloseTo(0.052)
    expect(size.x).toBeCloseTo(0.015)
    // D'un montant à l'autre (1 m moins deux montants de 5 cm), avec un demi-centimètre de recouvrement de chaque côté.
    expect(size.z).toBeCloseTo(0.91)
  })

  it('sans volet relié : trois vitres, les lames cachées et sans marque ; dans le mur d’en face, elle est retournée', () => {
    const m = furnitureMaterials()
    const group = windowOnWall(m, ROOM.xMax, -1, 0, 2.2, 1.25, 0.95, 3)
    expect(group.position.x).toBeCloseTo(ROOM.xMax + 0.025)
    expect(group.children).toHaveLength(8)
    expect(group.children[6].rotation.y).toBeCloseTo(-Math.PI / 2)
    const slats = group.children[7]
    expect(slats.visible).toBe(false)
    expect(slats.userData).toEqual({})
    // Les lames sont dehors : de l'autre côté de la vitre.
    expect(slats.children[0].position.x).toBeCloseTo(0.03)
  })
})

describe('patioWindows', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la porte-fenêtre et la grande fenêtre du salon, chacune reliée à son volet', () => {
    const group = patioWindows(furnitureMaterials())
    const shutters = tagged(group, 'shutter')
    expect(shutters.map((shutter) => shutter.userData.shutter)).toEqual(['porte', 'salon'])
    expect(shutters[0].userData.area).toBeCloseTo(PATIO_DOOR.width * PATIO_DOOR.height)
    expect(shutters[1].userData.area).toBeCloseTo(LAYOUT.bays.window.width * LAYOUT.bays.window.height)
    expect(shutters[0].parent?.position.z).toBe(PATIO_DOOR.z)
    expect(shutters[1].parent?.position.z).toBe(LAYOUT.bays.window.z)
    // Deux vitres pour la porte, trois pour la fenêtre.
    expect(shutters[0].parent?.children).toHaveLength(7)
    expect(shutters[1].parent?.children).toHaveLength(8)
  })

  it('trois rideaux bleus, trois voilages, la tringle qui s’arrête avant la poutre du poteau', () => {
    const m = furnitureMaterials()
    const group = patioWindows(m)
    const meshes = meshesOf(group)
    const curtains = meshes.filter((mesh) => mesh.material === m.curtain)
    expect(curtains.map((curtain) => curtain.position.z)).toEqual(LAYOUT.bays.curtains)
    for (const curtain of curtains) expect(curtain.position.x).toBeCloseTo(ROOM.xMin + 0.2)
    // Les voilages partagent un matériau translucide : un pan et trois plis chacun.
    const sheers = meshes.filter((mesh) => (mesh.material as THREE.Material).opacity === 0.6)
    expect(sheers).toHaveLength(12)
    expect(new Set(sheers.map((sheer) => sheer.material)).size).toBe(1)
    const rod = meshes.find((mesh) => mesh.material === m.metal) as THREE.Mesh
    const from = LAYOUT.bays.curtains[0] - 0.2
    const to = ENTRY.postZ - 0.08
    expect(sizeOf(rod).depth).toBeCloseTo(to - from)
    expect(rod.position.z).toBeCloseTo((from + to) / 2)
    // Le montage en briques : dix briques sous le plafond, contre le poteau.
    const bricks = group.children.filter((child) => Math.abs(child.position.z - ENTRY.postZ) < 0.06 && child.position.y > ROOM.height - 0.3 && child !== rod)
    expect(bricks).toHaveLength(10)
  })
})
