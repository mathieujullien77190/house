import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { ENTRY, LAYOUT, ROOM, SCREEN_OFF } from '@/components/Kitchen3D/constants'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { office } from './office'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const worldOf = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3())

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters

describe('office', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  const build = () => {
    const m = furnitureMaterials()
    const group = office(m)
    group.updateMatrixWorld(true)
    return { m, group, meshes: meshesOf(group) }
  }

  it('le bureau à sa place : un plateau de 1,70 m sur deux tréteaux', () => {
    const { m, group, meshes } = build()
    expect(group.position.toArray()).toEqual([LAYOUT.desk.x, 0, LAYOUT.desk.z])
    expect(meshes[0].material).toBe(m.woodLight)
    expect(sizeOf(meshes[0]).width).toBe(1.7)
    const trestles = group.children.slice(1, 3)
    expect(trestles.map((trestle) => trestle.position.x)).toEqual([-0.6, 0.6])
    // Quatre pieds, quatre traverses, un chapeau et deux tablettes par tréteau.
    for (const trestle of trestles) expect(trestle.children).toHaveLength(11)
  })

  it('deux écrans éteints côte à côte : des dalles noires qui ne se cliquent pas', () => {
    const { meshes } = build()
    const slabs = meshes.filter((mesh) => sizeOf(mesh).depth === 0.005 && sizeOf(mesh).width === 0.55)
    expect(slabs.map((slab) => worldOf(slab).x)).toEqual([LAYOUT.desk.x - 0.3, LAYOUT.desk.x + 0.3].map((x) => expect.closeTo(x)))
    for (const slab of slabs) {
      expect((slab.material as THREE.MeshBasicMaterial).color.getHex()).toBe(SCREEN_OFF)
      expect(slab.userData).toEqual({})
    }
    expect(slabs[0].material).not.toBe(slabs[1].material)
  })

  it('les deux lampes rouges et le plafonnier en fil d’acier portent le nom de leur lampe Hue', () => {
    const { meshes } = build()
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['ordi 1', 'ordi 2', 'salle à manger'])
    const [left, right, ceiling] = bulbs.map(worldOf)
    expect(left.x).toBeCloseTo(LAYOUT.desk.x - 0.75)
    expect(right.x).toBeCloseTo(LAYOUT.desk.x + 0.75)
    expect(left.z).toBeCloseTo(LAYOUT.desk.z + 0.26)
    expect(ceiling.x).toBeCloseTo(LAYOUT.desk.x)
    expect(ceiling.z).toBeCloseTo(LAYOUT.desk.z - 0.7)
    expect(ceiling.y).toBeGreaterThan(2)
    // Des pétales vides : aucun disque de cannage.
    expect(meshes.filter((mesh) => mesh.geometry.type === 'CircleGeometry')).toHaveLength(0)
  })

  it('la clim du salon, centrée sur le mur du bureau : un bloc à cliquer et son voyant sur la façade', () => {
    const { meshes } = build()
    const units = meshes.filter((mesh) => mesh.userData.acUnit !== undefined)
    const leds = meshes.filter((mesh) => mesh.userData.acLed !== undefined)
    expect(units.map((unit) => unit.userData.acUnit)).toEqual(['salon'])
    expect(leds.map((led) => led.userData.acLed)).toEqual(['salon'])
    const unit = worldOf(units[0])
    expect(unit.x).toBeCloseTo((ROOM.xMin + ENTRY.x - 0.06) / 2)
    expect(unit.z).toBeCloseTo(ROOM.zMax - 0.12)
    expect(worldOf(leds[0]).z).toBeLessThan(unit.z - 0.11)
    expect(worldOf(leds[0]).y).toBeLessThan(unit.y)
    expect((leds[0].material as THREE.MeshBasicMaterial).type).toBe('MeshBasicMaterial')
  })

  it('rien ne traverse le mur est ni le mur des baies', () => {
    const { group } = build()
    const box = new THREE.Box3().setFromObject(group)
    expect(box.max.z).toBeLessThanOrEqual(ROOM.zMax + 1e-9)
    expect(box.min.x).toBeGreaterThanOrEqual(ROOM.xMin - 1e-9)
  })
})
