import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { REST, ROOM, SAS } from '@/components/Kitchen3D/constants'
import { buildRooms } from './rooms'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const worldOf = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3())

/** Les maillages d'un groupe sont-ils tous dans ce rectangle `[x1, x2, z1, z2]` (leur centre, à `slack` près) ? */
const inside = (group: THREE.Object3D, [x1, x2, z1, z2]: [number, number, number, number], slack: number): boolean =>
  meshesOf(group).every((mesh) => {
    const { x, z } = worldOf(mesh)
    return x >= x1 - slack && x <= x2 + slack && z >= z1 - slack && z <= z2 + slack
  })

describe('buildRooms', () => {
  beforeEach(() => {
    stubCanvasContext(null)
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture())
  })

  it('quatre groupes, chacun dans ses murs : la chambre d’invité, la salle de bain, le sas, la chambre de Matou', () => {
    const root = buildRooms()
    root.updateMatrixWorld(true)
    expect(root.children).toHaveLength(4)
    const [guest, bath, sas, matou] = root.children
    expect(meshesOf(guest).length).toBeGreaterThan(60)
    expect(meshesOf(bath).length).toBeGreaterThan(40)
    expect(meshesOf(sas).length).toBeGreaterThan(10)
    expect(meshesOf(matou)).toHaveLength(7)
    expect(inside(guest, [REST.guestSouth, ROOM.xMax, REST.west, REST.guestEast], 0.06)).toBe(true)
    expect(inside(bath, [REST.bathSouth, ROOM.xMax, REST.bathWest, ROOM.zMin], 0.2)).toBe(true)
    expect(inside(sas, [SAS.south, SAS.north, SAS.west, SAS.east], 0.3)).toBe(true)
    expect(inside(matou, [ROOM.xMin, REST.corridorSouth, REST.west, REST.matouEast], 0)).toBe(true)
  })

  it('les clims des deux chambres se cliquent, chacune avec son voyant', () => {
    const meshes = meshesOf(buildRooms())
    const units = meshes.filter((mesh) => mesh.userData.acUnit !== undefined)
    const leds = meshes.filter((mesh) => mesh.userData.acLed !== undefined)
    expect(units.map((mesh) => mesh.userData.acUnit)).toEqual(['chambre-invite', 'chambre-matou'])
    expect(leds.map((mesh) => mesh.userData.acLed)).toEqual(['chambre-invite', 'chambre-matou'])
    expect(leds[0].material).not.toBe(leds[1].material)
    // Les quatre pièces partagent un seul jeu de matériaux : le même blanc pour les deux clims.
    expect(units[0].material).toBe(units[1].material)
  })

  it('les luminaires portent le nom de leur lampe Hue : le plafonnier de la chambre, les sept spots de la salle de bain, la suspension de Matou ; l’applique du sas n’a pas de nom', () => {
    const bulbs = meshesOf(buildRooms()).filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['chambre', 'sdb 1', 'sdb 4', 'sdb 3', 'sdb 5', 'sdb 2', 'sdb 6', 'sdb 7', undefined, 'hue ambiance lamp 1'])
    expect(new Set(bulbs.map((bulb) => bulb.material)).size).toBe(10)
    // Au plafond ou presque, sauf le spot de l'alcôve des WC et l'applique du sas, au mur.
    for (const bulb of bulbs) expect(bulb.position.y).toBeGreaterThan(['sdb 2', undefined].includes(bulb.userData.fixtureName as string | undefined) ? 1.9 : ROOM.height - 0.6)
  })
})
