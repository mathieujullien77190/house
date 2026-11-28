import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { KITCHEN, LAYOUT, ROOM } from '@/components/Kitchen3D/constants'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { BULB_OFF } from '@/components/Kitchen3D/primitives'
import { lamps, petalLamp } from './lamps'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const worldOf = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3())

describe('petalLamp', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('huit pétales de cannage cerclés de noir, un sur deux plus bas, et l’ampoule au nom de sa lampe', () => {
    const m = furnitureMaterials()
    const lamp = petalLamp(m, false, 'salon')
    const [flower] = lamp.children
    expect(flower.scale.toArray()).toEqual([1, 1, 1])
    const meshes = meshesOf(lamp)
    expect(meshes.filter((mesh) => mesh.geometry.type === 'TorusGeometry')).toHaveLength(8)
    const petals = meshes.filter((mesh) => mesh.geometry.type === 'CircleGeometry')
    expect(petals).toHaveLength(8)
    for (const petal of petals) expect(petal.material).toBe(m.wicker)
    expect(flower.children.slice(0, 8).map((holder) => holder.children[0].position.y)).toEqual([-0, -0.04, -0, -0.04, -0, -0.04, -0, -0.04])
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['salon'])
    expect((bulbs[0].material as THREE.MeshBasicMaterial).color.getHex()).toBe(BULB_OFF)
  })

  it('en fil d’acier : pas de cannage, onze rayons par pétale ; la taille règle la fleur', () => {
    const lamp = petalLamp(furnitureMaterials(), true, 'salle à manger', 0.65)
    expect(lamp.children[0].scale.toArray()).toEqual([0.65, 0.65, 0.65])
    const meshes = meshesOf(lamp)
    expect(meshes.filter((mesh) => mesh.geometry.type === 'CircleGeometry')).toHaveLength(0)
    // Par pétale : le cerclage et onze rayons ; plus l'ampoule, la rosace et la tige.
    expect(meshes).toHaveLength(8 * 12 + 3)
    // Le nombre de pétales se choisit (cinq au bureau) : ils se partagent le tour.
    const five = petalLamp(furnitureMaterials(), true, 'salle à manger', 0.65, 5)
    expect(meshesOf(five)).toHaveLength(5 * 12 + 3)
    expect(five.children[0].children.slice(0, 5).map((holder) => holder.rotation.y)).toEqual([0, 1, 2, 3, 4].map((petal) => expect.closeTo((petal / 5) * Math.PI * 2)))
  })
})

describe('lamps', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('le plafonnier du salon, la suspension du coin repas et les deux ampoules du bar, à leur place', () => {
    const group = lamps(furnitureMaterials())
    group.updateMatrixWorld(true)
    const bulbs = meshesOf(group).filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['salon', 'cuisine 2', 'bar 2', 'bar 1'])
    expect(new Set(bulbs.map((bulb) => bulb.material)).size).toBe(4)
    const [salon, nook, bar2, bar1] = bulbs.map(worldOf)
    expect(salon.x).toBeCloseTo(-3.7)
    expect(salon.z).toBeCloseTo(0.9)
    // Sous le plafond : la fleur pend 14 cm plus bas, l'ampoule dedans (à l'échelle 0,65).
    expect(salon.y).toBeCloseTo(ROOM.height - 0.14 - 0.12 * 0.65)
    expect(nook.toArray()).toEqual([LAYOUT.nookLamp.x - 0.3, 1.9, LAYOUT.nookLamp.z])
    expect(bar2.toArray()).toEqual([KITCHEN.xMin - 0.09, 1.74, 0.4])
    expect(bar1.toArray()).toEqual([KITCHEN.xMin - 0.09, 1.74, 1])
  })
})
