import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { GUEST_WINDOW, REST, ROOM } from '@/components/Kitchen3D/constants'
import { roomMaterials } from '@/components/Kitchen3D/materials'
import { BULB_OFF } from '@/components/Kitchen3D/primitives'
import { guestRoom } from './guestRoom'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const worldOf = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3())

const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters

/** Les maillages d'un groupe sont-ils tous dans ce rectangle `[x1, x2, z1, z2]` (leur centre, à `slack` près) ? */
const inside = (group: THREE.Object3D, [x1, x2, z1, z2]: [number, number, number, number], slack: number): boolean =>
  meshesOf(group).every((mesh) => {
    const { x, z } = worldOf(mesh)
    return x >= x1 - slack && x <= x2 + slack && z >= z1 - slack && z <= z2 + slack
  })

describe('guestRoom', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  const build = () => {
    const m = roomMaterials()
    const group = guestRoom(m)
    group.updateMatrixWorld(true)
    return { m, group, meshes: meshesOf(group) }
  }
  const middleZ = (REST.west + REST.guestEast) / 2

  it('tout tient dans la chambre', () => {
    const { group, meshes } = build()
    expect(meshes.length).toBeGreaterThan(60)
    expect(inside(group, [REST.guestSouth, ROOM.xMax, REST.west, REST.guestEast], 0.06)).toBe(true)
    for (const mesh of meshes) expect(worldOf(mesh).y).toBeLessThanOrEqual(ROOM.height)
  })

  it('le lit, la tête au nord, centré sur le mur : drap bleu nuit, couette et deux oreillers bordeaux', () => {
    const { m, meshes } = build()
    const sheet = meshes.find((mesh) => mesh.material === m.navy) as THREE.Mesh
    expect(sheet.position.z).toBe(middleZ)
    expect(sheet.position.x).toBeCloseTo(ROOM.xMax - 0.05 - 1.05)
    const burgundy = meshes.filter((mesh) => mesh.material === m.burgundy)
    expect(burgundy).toHaveLength(6)
    const pillows = burgundy.filter((mesh) => sizeOf(mesh).width === 0.42)
    expect(pillows.map((pillow) => pillow.position.z - middleZ)).toEqual([-0.4, 0.4].map((z) => expect.closeTo(z)))
  })

  it('la clim au-dessus du lit se clique et a son voyant, sous elle sur la façade', () => {
    const { meshes } = build()
    const units = meshes.filter((mesh) => mesh.userData.acUnit !== undefined)
    const leds = meshes.filter((mesh) => mesh.userData.acLed !== undefined)
    expect(units.map((mesh) => mesh.userData.acUnit)).toEqual(['chambre-invite'])
    expect(leds.map((mesh) => mesh.userData.acLed)).toEqual(['chambre-invite'])
    expect(units[0].position.toArray()).toEqual([ROOM.xMax - 0.12, 2.05, middleZ + 0.05])
    expect(leds[0].position.y).toBeLessThan(units[0].position.y)
    expect(leds[0].position.x).toBeLessThan(units[0].position.x - 0.11)
    expect((leds[0].material as THREE.MeshBasicMaterial).type).toBe('MeshBasicMaterial')
  })

  it('le plafonnier en raphia porte le nom de la lampe « chambre » ; les deux suspensions du lit ne sont pas reliées', () => {
    const { m, meshes } = build()
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['chambre'])
    expect(bulbs[0].position.toArray()).toEqual([(ROOM.xMax + REST.guestSouth) / 2, ROOM.height - 0.33, middleZ])
    expect((bulbs[0].material as THREE.MeshBasicMaterial).color.getHex()).toBe(BULB_OFF)
    const bedside = meshes.filter((mesh) => mesh.material === m.bulb)
    expect(bedside.map((bulb) => bulb.position.z - middleZ)).toEqual([-0.98, 0.98].map((z) => expect.closeTo(z)))
    for (const bulb of bedside) expect(bulb.position.y).toBeCloseTo(1.25)
  })

  it('la fenêtre du mur ouest derrière son rideau fermé à quinze plis', () => {
    const { m, meshes } = build()
    const glass = meshes.find((mesh) => mesh.material === m.glass) as THREE.Mesh
    expect(glass.position.toArray()).toEqual([GUEST_WINDOW.z, GUEST_WINDOW.bottom + GUEST_WINDOW.height / 2, REST.west - 0.025])
    const curtain = meshes.find((mesh) => mesh.material === m.curtain) as THREE.Mesh
    expect(sizeOf(curtain).width).toBe(1.5)
    expect(curtain.position.x).toBe(GUEST_WINDOW.z)
    // Le rideau couvre toute la fenêtre.
    expect(sizeOf(curtain).width).toBeGreaterThan(GUEST_WINDOW.width)
    const folds = meshes.filter((mesh) => sizeOf(mesh).width === 0.03 && sizeOf(mesh).height === 2.24)
    expect(folds).toHaveLength(15)
  })

  it('le miroir sur pied, dans le coin sud-ouest, tourné vers la pièce et penché', () => {
    const { group } = build()
    const mirror = group.children.find((child) => child.type === 'Group') as THREE.Group
    expect(mirror.position.toArray()).toEqual([REST.guestSouth + 0.3, 0, REST.west + 0.3])
    expect(mirror.rotation.y).toBeCloseTo(-Math.PI / 4)
    expect(mirror.rotation.z).toBeCloseTo(0.1)
    expect(mirror.children).toHaveLength(2)
  })
})
