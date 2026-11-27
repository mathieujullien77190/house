import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { BATH_WINDOW, REST, ROOM, WC_ALCOVE } from '@/components/Kitchen3D/constants'
import { roomMaterials } from '@/components/Kitchen3D/materials'
import { bathroom } from './bathroom'

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

describe('bathroom', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  const build = () => {
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture())
    const m = roomMaterials()
    const group = bathroom(m)
    group.updateMatrixWorld(true)
    return { load, m, group, meshes: meshesOf(group) }
  }

  it('tout tient dans la salle de bain (la fenêtre et l’alcôve sont dans l’épaisseur des murs)', () => {
    const { group, meshes } = build()
    expect(meshes.length).toBeGreaterThan(40)
    expect(inside(group, [REST.bathSouth, ROOM.xMax, REST.bathWest, ROOM.zMin], 0.2)).toBe(true)
  })

  it('six spots au plafond, un par lampe Hue : trois dans l’allée, un sur la douche, deux devant le miroir', () => {
    const { m, meshes } = build()
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['sdb 1', 'sdb 4', 'sdb 3', 'sdb 5', 'sdb 6', 'sdb 7'])
    expect(new Set(bulbs.map((bulb) => bulb.material)).size).toBe(6)
    for (const bulb of bulbs) expect(bulb.position.y).toBeCloseTo(ROOM.height - 0.02)
    // L'allée : en ligne, de la fenêtre (nord) à la porte (sud).
    const aisle = bulbs.slice(0, 3)
    for (const bulb of aisle) expect(bulb.position.z).toBeCloseTo(REST.bathWest + 0.56)
    expect(aisle[0].position.x).toBeGreaterThan(aisle[1].position.x)
    expect(aisle[1].position.x).toBeGreaterThan(aisle[2].position.x)
    // Les deux du lavabo, côte à côte de part et d'autre du milieu du meuble.
    expect(bulbs[5].position.x - bulbs[4].position.x).toBeCloseTo(0.44)
    expect(bulbs[4].position.z).toBe(bulbs[5].position.z)
    // Chacun sa collerette chromée.
    const collars = meshes.filter((mesh) => mesh.material === m.chrome && mesh.geometry.type === 'CylinderGeometry' && (mesh.geometry as THREE.CylinderGeometry).parameters.height === 0.012)
    expect(collars).toHaveLength(6)
  })

  it('cinq cadres aux WC : leurs photos viennent de `public/kitchen3d/`, trois sur la cloison et deux sur le mur d’en face', () => {
    const { load, meshes } = build()
    expect(load.mock.calls.map(([url]) => url)).toEqual(['wc-flamingo', 'wc-waxwing', 'wc-ink', 'wc-plants', 'wc-owl'].map((name) => `${import.meta.env.BASE_URL}kitchen3d/${name}.jpg`))
    const images = meshes.filter((mesh) => mesh.geometry.type === 'PlaneGeometry' && (mesh.material as THREE.MeshStandardMaterial).roughness === 0.7)
    expect(images).toHaveLength(5)
    // Ceux de la cloison regardent le sud, ceux du mur sud regardent le nord.
    expect(images.map((image) => Math.sign(image.rotation.y))).toEqual([-1, -1, -1, 1, 1])
    const wcNorth = REST.bathSouth + 1
    for (const image of images.slice(0, 3)) expect(image.position.x).toBeCloseTo(wcNorth - 0.035 - 0.024)
    for (const image of images.slice(3)) expect(image.position.x).toBeCloseTo(REST.bathSouth + 0.024)
  })

  it('la cuvette sous son alcôve, creusée dans le mur est', () => {
    const { meshes } = build()
    const bowl = meshes.find((mesh) => mesh.geometry.type === 'SphereGeometry' && mesh.scale.z === 1.3) as THREE.Mesh
    expect(bowl.position.x).toBe(WC_ALCOVE.x)
    const hollow = meshes.find((mesh) => (mesh.material as THREE.Material).side === THREE.BackSide) as THREE.Mesh
    expect(sizeOf(hollow)).toMatchObject({ width: WC_ALCOVE.width, height: WC_ALCOVE.height, depth: WC_ALCOVE.depth })
    expect(hollow.position.toArray()).toEqual([WC_ALCOVE.x, WC_ALCOVE.bottom + WC_ALCOVE.height / 2, ROOM.zMin + WC_ALCOVE.depth / 2])
    // Trois rouleaux en réserve sur le coffre.
    const rolls = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && (mesh.geometry as THREE.CylinderGeometry).parameters.height === 0.1 && mesh.position.y === 0.37)
    expect(rolls).toHaveLength(3)
  })

  it('la douche : le receveur de 1,10 m sur 90 cm contre le mur est, et deux pans carrelés à la mesure des carreaux de 15 cm', () => {
    const { meshes } = build()
    const tray = meshes.find((mesh) => sizeOf(mesh).width === 1.1 && sizeOf(mesh).depth === 0.9) as THREE.Mesh
    expect(tray.position.z).toBeCloseTo(ROOM.zMin - 0.45)
    const tiled = meshes.filter((mesh) => mesh.geometry.type === 'PlaneGeometry' && sizeOf(mesh).height === 2.2)
    expect(tiled).toHaveLength(2)
    const maps = tiled.map((mesh) => (mesh.material as THREE.MeshStandardMaterial).map as THREE.Texture)
    // Chaque pan a sa copie de l'image (seize carreaux de côté), répétée selon sa taille.
    expect(maps[0]).not.toBe(maps[1])
    expect(maps[0].repeat.x).toBeCloseTo(sizeOf(tiled[0]).width / 2.4)
    expect(maps[1].repeat.x).toBeCloseTo(0.9 / 2.4)
    for (const map of maps) expect(map.repeat.y).toBeCloseTo(2.2 / 2.4)
  })

  it('le carrelage de la douche : seize rangées de seize carreaux sur un fond clair', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    build()
    const tiles = (context.fillRect.mock.calls as [number, number, number, number][]).filter(([, , width, height]) => width === 30 && height === 30)
    expect(tiles).toHaveLength(256)
    expect(tiles[0]).toEqual([1, 1, 30, 30])
    expect(tiles.at(-1)).toEqual([481, 481, 30, 30])
  })

  it('la fenêtre dépolie du mur nord : deux vantaux translucides dans l’épaisseur du mur', () => {
    const { meshes } = build()
    const panes = meshes.filter((mesh) => (mesh.material as THREE.Material).opacity === 0.75)
    expect(panes).toHaveLength(2)
    expect(panes[0].material).toBe(panes[1].material)
    for (const pane of panes) {
      expect(pane.position.x).toBeCloseTo(ROOM.xMax + 0.1)
      expect(pane.position.y).toBeCloseTo(BATH_WINDOW.bottom + BATH_WINDOW.height / 2)
    }
    expect((panes[0].position.z + panes[1].position.z) / 2).toBeCloseTo(BATH_WINDOW.z)
  })
})
