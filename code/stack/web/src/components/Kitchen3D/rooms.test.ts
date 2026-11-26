import type * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { REST, ROOM, SAS } from './constants'
import { buildRooms } from './rooms'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

/** Les maillages d'un groupe sont-ils tous dans ce rectangle `[x1, x2, z1, z2]` (leur centre, à `slack` près) ? */
const inside = (group: THREE.Object3D, [x1, x2, z1, z2]: [number, number, number, number], slack: number): boolean =>
  meshesOf(group).every((mesh) => {
    const { x, z } = mesh.getWorldPosition(mesh.position.clone())
    return x >= x1 - slack && x <= x2 + slack && z >= z1 - slack && z <= z2 + slack
  })

describe('buildRooms', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('trois pièces meublées, chacune dans ses murs : la chambre d’invité, la salle de bain, le sas', () => {
    const root = buildRooms()
    root.updateMatrixWorld(true)
    expect(root.children).toHaveLength(3)
    const [guest, bath, sas] = root.children
    expect(meshesOf(guest).length).toBeGreaterThan(60)
    expect(meshesOf(bath).length).toBeGreaterThan(40)
    expect(meshesOf(sas).length).toBeGreaterThan(10)
    expect(inside(guest, [REST.guestSouth, ROOM.xMax, REST.west, REST.guestEast], 0.06)).toBe(true)
    expect(inside(bath, [REST.bathSouth, ROOM.xMax, REST.bathWest, ROOM.zMin], 0.2)).toBe(true)
    expect(inside(sas, [SAS.south, SAS.north, SAS.west, SAS.east], 0.3)).toBe(true)
  })

  it('la clim de la chambre d’invité se clique et a son voyant', () => {
    const meshes = meshesOf(buildRooms())
    const units = meshes.filter((mesh) => mesh.userData.acUnit !== undefined)
    const leds = meshes.filter((mesh) => mesh.userData.acLed !== undefined)
    expect(units.map((mesh) => mesh.userData.acUnit)).toEqual(['chambre-invite'])
    expect(leds.map((mesh) => mesh.userData.acLed)).toEqual(['chambre-invite'])
    // Le voyant est sur la façade de la clim, sous elle.
    expect(leds[0].position.y).toBeLessThan(units[0].position.y)
    expect((leds[0].material as THREE.MeshBasicMaterial).type).toBe('MeshBasicMaterial')
  })

  it('les luminaires portent le nom de leur lampe Hue : le plafonnier de la chambre et les six spots de la salle de bain', () => {
    const bulbs = meshesOf(buildRooms()).filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['chambre', 'sdb 1', 'sdb 4', 'sdb 3', 'sdb 5', 'sdb 6', 'sdb 7'])
    expect(new Set(bulbs.map((bulb) => bulb.material)).size).toBe(7)
    for (const bulb of bulbs) expect(bulb.position.y).toBeGreaterThan(ROOM.height - 0.4)
  })

  it('le carrelage de la douche : seize rangées de seize carreaux sur un fond clair', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    buildRooms()
    const tiles = (context.fillRect.mock.calls as [number, number, number, number][]).filter(([, , width, height]) => width === 30 && height === 30)
    expect(tiles).toHaveLength(256)
    expect(tiles[0]).toEqual([1, 1, 30, 30])
    expect(tiles.at(-1)).toEqual([481, 481, 30, 30])
  })
})
