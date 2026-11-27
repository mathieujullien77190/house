import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { ENTRY, KITCHEN, LAYOUT, PASSAGE, REST, ROOM, SAS, SHELL, WC_ALCOVE } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import { bathKitchenWall, corridor, guestAndBath, laundry, matouRoom } from './rest'
import { wallKit } from './walls'
import type { Shell } from './walls'

/** Un gros œuvre vide, prêt à recevoir ce qu'un constructeur y ajoute. */
const emptyShell = (): Shell => {
  const maps = kitchenMaps()
  const materials = kitchenMaterials(maps)
  const group = new THREE.Group()
  return { group, materials, maps, floors: [], sill: new THREE.MeshStandardMaterial(), ...wallKit(group, materials) }
}
const meshes = (shell: Shell) => shell.group.children as THREE.Mesh[]
const boxOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
const planeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.PlaneGeometry).parameters
const boxes = (shell: Shell) => meshes(shell).filter((mesh) => mesh.geometry.type === 'BoxGeometry')
const floorsOf = (shell: Shell) => meshes(shell).filter((mesh) => mesh.geometry.type === 'PlaneGeometry' && Math.abs(mesh.rotation.x + Math.PI / 2) < 1e-9)

describe('le reste de la maison', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la chambre d’invité (sisal) et la salle de bain (petites lames), séparées du couloir par des murs épais à seuil de chêne', () => {
    const shell = emptyShell()
    guestAndBath(shell)
    const [guestFloor, bathFloor] = floorsOf(shell)
    // La chambre d'invité : 3,84 m (mesurée à 3,77 m, ramenée pour que le mur soit dans le prolongement de celui du couloir) sur 2,54 m, son propre sol.
    expect(planeOf(guestFloor)).toMatchObject({ width: expect.closeTo(3.84), height: expect.closeTo(2.54) })
    expect(guestFloor.material).not.toBe(shell.materials.floor)
    // La salle de bain : 2,85 m sur 2,02 m, le fond sombre sous son parquet.
    expect(planeOf(bathFloor)).toMatchObject({ width: expect.closeTo(2.85), height: expect.closeTo(2.02) })
    expect(bathFloor.material).toBe(shell.materials.floor)
    const parquets = shell.group.children.filter((child) => (child as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh[]
    expect(parquets).toHaveLength(1)
    expect(parquets[0].count).toBeGreaterThan(80)
    // Rien n'est inscrit pour le grand parquet.
    expect(shell.floors).toEqual([])
    // La cloison entre les deux pièces fait 8 cm.
    const partitionWall = boxes(shell).find((mesh) => Math.abs(boxOf(mesh).depth - 0.078) < 1e-9) as THREE.Mesh
    expect(boxOf(partitionWall).height).toBe(ROOM.height)
    expect(partitionWall.position.z).toBeCloseTo((REST.bathWest + REST.guestEast) / 2)
    // Deux murs épais, chacun avec une porte : deux seuils.
    const thresholds = boxes(shell).filter((mesh) => mesh.material === shell.sill)
    expect(thresholds).toHaveLength(2)
    for (const threshold of thresholds) expect(threshold.position.y).toBeCloseTo(-0.005)
    // L'alcôve des WC est une ouverture en hauteur dans le mur est de la salle de bain.
    const alcoveSill = meshes(shell).find((mesh) => mesh.geometry.type === 'PlaneGeometry' && mesh.position.z === ROOM.zMin && Math.abs(planeOf(mesh).height - WC_ALCOVE.bottom) < 1e-9) as THREE.Mesh
    expect(planeOf(alcoveSill).width).toBeCloseTo(WC_ALCOVE.width)
    expect(alcoveSill.position.x).toBeCloseTo(WC_ALCOVE.x)
  })

  it('le mur de la chambre de Matou (6 cm pris sur elle) va jusqu’à la porte, la reprend de l’autre côté jusqu’à la penderie, et passe plein au-dessus de la porte', () => {
    const shell = emptyShell()
    guestAndBath(shell)
    const thick = REST.guestSouth - (REST.corridorSouth - 0.06) - 0.002
    const pieces = boxes(shell).filter((mesh) => Math.abs(boxOf(mesh).width - thick) < 1e-9)
    // Avant la porte, après la porte, et le linteau au-dessus d'elle.
    expect(pieces).toHaveLength(3)
    const [before, after, lintel] = pieces
    expect(boxOf(before).height).toBe(ROOM.height)
    expect(boxOf(after).height).toBe(ROOM.height)
    expect(before.position.z - boxOf(before).depth / 2).toBeCloseTo(REST.west + 0.001)
    expect(after.position.z + boxOf(after).depth / 2).toBeCloseTo(REST.matouEast)
    expect(boxOf(lintel).height).toBeCloseTo(ROOM.height - PASSAGE.top)
    expect(lintel.position.y).toBeCloseTo((ROOM.height + PASSAGE.top) / 2)
    // Le linteau comble exactement l'espace entre les deux : la porte.
    expect(before.position.z + boxOf(before).depth / 2).toBeCloseTo(lintel.position.z - boxOf(lintel).depth / 2)
    expect(lintel.position.z + boxOf(lintel).depth / 2).toBeCloseTo(after.position.z - boxOf(after).depth / 2)
  })

  it('le couloir : du parquet comme au salon, un linteau plein au-dessus de sa porte, et son plafonnier « couloir »', () => {
    const shell = emptyShell()
    corridor(shell)
    expect(shell.floors).toEqual([[REST.corridorSouth, REST.corridorNorth, REST.middle, ROOM.zMin]])
    // Mesuré : 1,80 m de long sur 78 cm de large.
    expect(planeOf(floorsOf(shell)[0])).toMatchObject({ width: expect.closeTo(0.78), height: expect.closeTo(1.8) })
    const lintel = boxes(shell).find((mesh) => boxOf(mesh).depth === 0.05) as THREE.Mesh
    expect(boxOf(lintel)).toMatchObject({ width: expect.closeTo(LAYOUT.door.width), height: expect.closeTo(ROOM.height - PASSAGE.top) })
    expect(lintel.position.z).toBeLessThan(ROOM.zMin)
    const bulbs = meshes(shell).filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName)).toEqual(['couloir'])
    expect(bulbs[0].position.x).toBeCloseTo(LAYOUT.door.x)
    expect(bulbs[0].position.z).toBeCloseTo((REST.middle + ROOM.zMin) / 2)
    // La rosace est au plafond, la coupole d'osier ouverte juste au-dessus de l'ampoule.
    const shade = meshes(shell).find((mesh) => mesh.geometry.type === 'ConeGeometry') as THREE.Mesh
    expect((shade.geometry as THREE.ConeGeometry).parameters.openEnded).toBe(true)
    expect(shade.position.y).toBeGreaterThan(bulbs[0].position.y)
    const rosette = meshes(shell).find((mesh) => mesh.geometry.type === 'CylinderGeometry') as THREE.Mesh
    expect(rosette.position.y + 0.01).toBeCloseTo(ROOM.height)
  })

  it('la chambre de Matou : un sol uni, sa porte ouverte, le placard à quatre portes de quatre panneaux', () => {
    const shell = emptyShell()
    matouRoom(shell)
    expect(shell.floors).toEqual([])
    const [floor] = floorsOf(shell)
    expect(floor.position.y).toBe(0)
    expect(planeOf(floor).height).toBeCloseTo(3.86)
    const doors = boxes(shell).filter((mesh) => Math.abs(boxOf(mesh).width - 0.492) < 1e-9 && Math.abs(boxOf(mesh).height - 2.01) < 1e-9)
    expect(doors).toHaveLength(4)
    for (const door of doors) expect(door.position.z).toBeCloseTo(REST.matouEast - 0.012)
    expect(new Set(doors.map((door) => door.material)).size).toBe(1)
    const panels = boxes(shell).filter((mesh) => boxOf(mesh).depth === 0.004)
    expect(panels).toHaveLength(16)
    // Les poignées du placard : du côté où la porte s'ouvre, deux par deux vers le milieu.
    const handles = boxes(shell).filter((mesh) => boxOf(mesh).height === 0.14)
    expect(handles).toHaveLength(4)
    expect(handles.map((handle, index) => Math.sign(handle.position.x - doors[index].position.x))).toEqual([1, 1, -1, -1])
    // Le battant de la porte de la chambre, ouvert dans la pièce, et sa poignée des deux côtés.
    const leaf = boxes(shell).find((mesh) => boxOf(mesh).depth === 0.04) as THREE.Mesh
    expect(boxOf(leaf).height).toBeCloseTo(PASSAGE.top - 0.02)
    expect(leaf.position.x).toBeLessThan(REST.corridorSouth)
    expect(boxes(shell).filter((mesh) => boxOf(mesh).width === 0.12 && boxOf(mesh).height === 0.02)).toHaveLength(2)
    // Le mur épais du placard va de la chambre au mur de la télé.
    const closetWall = boxes(shell).find((mesh) => Math.abs(boxOf(mesh).depth - (ROOM.zMin - REST.matouEast - 0.002)) < 1e-9) as THREE.Mesh
    expect(boxOf(closetWall).height).toBe(ROOM.height)
  })

  it('la buanderie : derrière le mur de l’escalier, sa porte sur le sas dans un mur de 5 cm', () => {
    const shell = emptyShell()
    laundry(shell)
    const [floor] = floorsOf(shell)
    expect(floor.position.x).toBeCloseTo((SAS.north + 0.05 + ROOM.xMax) / 2)
    expect(planeOf(floor).height).toBeCloseTo(ROOM.zMax - SHELL.shellBack)
    const thresholds = boxes(shell).filter((mesh) => mesh.material === shell.sill)
    expect(thresholds).toHaveLength(1)
    expect(boxOf(thresholds[0])).toMatchObject({ width: expect.closeTo(0.048), depth: expect.closeTo(SAS.laundry[1] - SAS.laundry[0]) })
    // L'écart derrière le mur de l'entrée est plein.
    const filler = meshes(shell).at(-1) as THREE.Mesh
    expect(boxOf(filler)).toMatchObject({ width: expect.closeTo(SAS.north - ENTRY.northX), height: ROOM.height, depth: expect.closeTo(SAS.west - SHELL.shellBack) })
  })

  it('le mur entre la salle de bain et la cuisine : 30 cm, en retrait derrière l’alcôve des WC seulement', () => {
    const shell = emptyShell()
    bathKitchenWall(shell)
    const [south, behind, above, below, north] = meshes(shell)
    expect(shell.group.children).toHaveLength(5)
    const thick = KITCHEN.zMin - ROOM.zMin - 0.002
    expect(boxOf(south).depth).toBeCloseTo(thick)
    expect(boxOf(north).depth).toBeCloseTo(thick)
    expect(boxOf(behind).depth).toBeCloseTo(thick - WC_ALCOVE.depth)
    expect(behind.position.x).toBeCloseTo(WC_ALCOVE.x)
    // Au-dessus et en dessous de l'alcôve, le mur est plein.
    expect(above.position.y + boxOf(above).height / 2).toBeCloseTo(ROOM.height)
    expect(above.position.y - boxOf(above).height / 2).toBeCloseTo(WC_ALCOVE.bottom + WC_ALCOVE.height)
    expect(boxOf(below).height).toBe(WC_ALCOVE.bottom)
    expect(boxOf(below).depth).toBe(WC_ALCOVE.depth)
    // D'un bout à l'autre du mur.
    expect(south.position.x - boxOf(south).width / 2).toBeCloseTo(KITCHEN.xMin + 0.001)
    expect(north.position.x + boxOf(north).width / 2).toBeCloseTo(ROOM.xMax - 0.001)
  })
})
