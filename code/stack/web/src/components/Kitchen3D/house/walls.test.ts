import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { PASSAGE, ROOM } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import { SMALL_PLANK } from './parquet'
import { wallKit } from './walls'
import type { Bay } from './walls'

/** Les outils du gros œuvre, sur un groupe vide. */
const kit = () => {
  const materials = kitchenMaterials(kitchenMaps())
  const group = new THREE.Group()
  return { group, materials, ...wallKit(group, materials) }
}
const meshes = (group: THREE.Group) => group.children as THREE.Mesh[]
const boxOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
const planeOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.PlaneGeometry).parameters
const isPlane = (mesh: THREE.Mesh) => mesh.geometry.type === 'PlaneGeometry'
const BAY: Bay = { z: 2, width: 1, bottom: 0.9, height: 1.2 }

describe('wallKit', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('une plinthe de chêne de 8 cm, plaquée du côté visible ; celle le long de z recouvre l’autre aux angles', () => {
    const { group, materials, skirting } = kit()
    skirting('x', 1, 3, 5, 1)
    skirting('z', 1, 3, 5, -1)
    const [alongX, alongZ] = meshes(group)
    expect(boxOf(alongX)).toMatchObject({ width: 2, height: 0.0796, depth: 0.016 })
    expect(alongX.position.toArray()).toEqual([2, 0.0398, expect.closeTo(5.008)])
    // Le long de z : elle dépasse de son épaisseur à chaque bout, et monte un cheveu plus haut.
    expect(boxOf(alongZ)).toMatchObject({ width: 0.016, height: 0.08, depth: expect.closeTo(2.032) })
    expect(alongZ.position.toArray()).toEqual([expect.closeTo(4.992), 0.04, 2])
    expect(alongX.material).toBe(materials.beam)
    expect(alongZ.material).toBe(materials.beam)
  })

  it('un pan de mur est tourné vers sa face visible, le long de x comme le long de z', () => {
    const { group, materials, wall } = kit()
    wall('x', 0, 2, 1, 1, 0.5)
    wall('x', 0, 2, 1, -1, 0.5)
    wall('z', 0, 2, 1, 1, 0.5)
    wall('z', 0, 2, 1, -1, 0.5)
    const panes = meshes(group)
    // Aucun ne part du sol : pas de plinthe.
    expect(panes).toHaveLength(4)
    expect(panes.map((pane) => pane.rotation.y)).toEqual([0, Math.PI, Math.PI / 2, -Math.PI / 2])
    for (const pane of panes) {
      expect(pane.material).toBe(materials.wall)
      expect(planeOf(pane)).toMatchObject({ width: 2, height: ROOM.height - 0.5 })
      expect(pane.position.y).toBeCloseTo((ROOM.height + 0.5) / 2)
    }
    expect(panes[0].position.toArray()).toEqual([1, expect.closeTo((ROOM.height + 0.5) / 2), 1])
    expect(panes[2].position.toArray()).toEqual([1, expect.closeTo((ROOM.height + 0.5) / 2), 1])
  })

  it('un pan qui part du sol a sa plinthe, sauf dans une niche', () => {
    const { group, wall } = kit()
    wall('x', 0, 2, 1, 1)
    expect(meshes(group).map((mesh) => mesh.geometry.type)).toEqual(['PlaneGeometry', 'BoxGeometry'])
    expect(planeOf(meshes(group)[0]).height).toBe(ROOM.height)
    wall('x', 0, 2, 1, 1, 0, 1.2, false)
    expect(group.children).toHaveLength(3)
    expect(planeOf(meshes(group)[2]).height).toBe(1.2)
  })

  it('une dalle, sol ou plafond : sa texture suit les cotes de la scène', () => {
    const { group, materials, slab } = kit()
    slab(materials.floor, 0, true, [1, 3, 4, 8])
    slab(materials.lambris, ROOM.height, false, [1, 3, 4, 8])
    const [floor, ceiling] = meshes(group)
    expect(planeOf(floor)).toMatchObject({ width: 2, height: 4 })
    expect(floor.position.toArray()).toEqual([2, 0, 6])
    expect(floor.rotation.x).toBeCloseTo(-Math.PI / 2)
    expect(ceiling.rotation.x).toBeCloseTo(Math.PI / 2)
    expect(ceiling.position.y).toBe(ROOM.height)
    // Un motif par mètre : les coordonnées de texture vont de 1 à 3 et de 4 à 8.
    const uv = floor.geometry.getAttribute('uv')
    const us = Array.from({ length: uv.count }, (_, index) => uv.getX(index))
    const vs = Array.from({ length: uv.count }, (_, index) => uv.getY(index))
    expect([Math.min(...us), Math.max(...us)]).toEqual([1, 3])
    expect([Math.min(...vs), Math.max(...vs)]).toEqual([4, 8])
  })

  it('un mur percé de fenêtres : des pans autour de chaque baie, et une seule plinthe sur toute sa longueur', () => {
    const { group, pierced } = kit()
    pierced('z', 0, 5, 1, 1, [BAY])
    const panes = meshes(group).filter(isPlane)
    // Avant la baie, l'allège, le linteau, après la baie.
    expect(panes.map((pane) => [planeOf(pane).width, planeOf(pane).height])).toEqual([
      [1.5, ROOM.height],
      [1, BAY.bottom],
      [1, expect.closeTo(ROOM.height - BAY.bottom - BAY.height)],
      [2.5, ROOM.height],
    ])
    expect(panes[1].position.z).toBe(BAY.z)
    expect(panes[2].position.y).toBeCloseTo((BAY.bottom + BAY.height + ROOM.height) / 2)
    const skirtings = meshes(group).filter((mesh) => !isPlane(mesh))
    expect(skirtings).toHaveLength(1)
    expect(boxOf(skirtings[0]).depth).toBeCloseTo(5.032)
  })

  it('les baies sont prises dans l’ordre le long du mur, quel que soit l’ordre donné', () => {
    const { group, pierced } = kit()
    pierced('x', 0, 6, 1, -1, [{ ...BAY, z: 4.5 }, BAY])
    const panes = meshes(group).filter(isPlane)
    expect(panes).toHaveLength(7)
    expect(panes.map((pane) => pane.position.x)).toEqual([0.75, 2, 2, 3.25, 4.5, 4.5, 5.5])
    for (const pane of panes) expect(planeOf(pane).width).toBeGreaterThan(0)
  })

  it('un mur percé de portes : un linteau au-dessus de chaque passage, des plinthes de part et d’autre seulement', () => {
    const { group, gapped } = kit()
    gapped('x', 0, 4, 1, 1)
    expect(meshes(group).map((mesh) => mesh.geometry.type)).toEqual(['PlaneGeometry', 'BoxGeometry'])
    group.clear()
    gapped('x', 0, 4, 1, 1, [[1, 1.8]])
    expect(meshes(group).map((mesh) => mesh.geometry.type)).toEqual(['PlaneGeometry', 'BoxGeometry', 'PlaneGeometry', 'PlaneGeometry', 'BoxGeometry'])
    const lintel = meshes(group)[2]
    expect(planeOf(lintel)).toMatchObject({ width: expect.closeTo(0.8), height: expect.closeTo(ROOM.height - PASSAGE.top) })
    expect(lintel.position.x).toBeCloseTo(1.4)
    // La plinthe s'arrête au passage.
    expect(boxOf(meshes(group)[1]).width).toBe(1)
    expect(boxOf(meshes(group)[4]).width).toBeCloseTo(2.2)
  })

  it('un mur épais plein : vu des deux côtés, avec son linteau et un seuil au sol dans chaque passage', () => {
    const { group, materials, solid } = kit()
    const sill = new THREE.MeshStandardMaterial()
    solid('z', 0, 4, 1, 1.3, [[1, 1.8]], sill)
    solid('x', 0, 4, 1, 1.3, [], sill)
    const [before, lintel, threshold, after, plain] = meshes(group)
    expect(group.children).toHaveLength(5)
    expect(boxOf(before)).toMatchObject({ width: expect.closeTo(0.298), height: ROOM.height, depth: 1 })
    expect(before.position.toArray()).toEqual([1.15, ROOM.height / 2, 0.5])
    expect(boxOf(lintel)).toMatchObject({ height: expect.closeTo(ROOM.height - PASSAGE.top), depth: expect.closeTo(0.8) })
    expect(lintel.position.y).toBeCloseTo((ROOM.height + PASSAGE.top) / 2)
    expect(threshold.material).toBe(sill)
    expect(boxOf(threshold).height).toBeCloseTo(0.01)
    expect(threshold.position.y).toBeCloseTo(-0.005)
    expect(boxOf(after).depth).toBeCloseTo(2.2)
    for (const piece of [before, lintel, after, plain]) expect(piece.material).toBe(materials.wall)
    // Le long de x : la longueur est sur x, l'épaisseur sur z.
    expect(boxOf(plain)).toMatchObject({ width: 4, depth: expect.closeTo(0.298) })
    expect(plain.position.toArray()).toEqual([2, ROOM.height / 2, 1.15])
  })

  it('une pièce vide : quatre murs à plinthe tournés vers l’intérieur, un plafond de lambris, son sol', () => {
    const { group, materials, emptyRoom } = kit()
    const floor = new THREE.MeshStandardMaterial()
    emptyRoom([0, 2, 0, 3], floor)
    const all = meshes(group)
    expect(all).toHaveLength(10)
    const panes = all.slice(0, 8).filter(isPlane)
    // Ouest (z = 0), est (z = 3), sud (x = 0), nord (x = 2).
    expect(panes.map((pane) => [pane.position.x, pane.position.z, pane.rotation.y])).toEqual([
      [1, 0, 0],
      [1, 3, Math.PI],
      [0, 1.5, Math.PI / 2],
      [2, 1.5, -Math.PI / 2],
    ])
    const [ceiling, ground] = all.slice(8)
    expect(ceiling.material).toBe(materials.lambris)
    expect(ceiling.position.y).toBe(ROOM.height)
    expect(ground.material).toBe(floor)
    expect(ground.position.y).toBe(0)
  })

  it('ses murs sont percés de portes ou de baies, côté par côté', () => {
    const doors = kit()
    doors.emptyRoom([0, 4, 0, 4], new THREE.MeshStandardMaterial(), { west: [[1, 2]], east: [[1, 2]], south: [[1, 2]], north: [[1, 2]] })
    // Par mur : deux pans à plinthe et un linteau ; puis le plafond et le sol.
    expect(doors.group.children).toHaveLength(4 * 5 + 2)
    const bays = kit()
    bays.emptyRoom([0, 4, 0, 4], new THREE.MeshStandardMaterial(), {}, { west: [BAY], east: [BAY], south: [BAY], north: [BAY] })
    // Par mur : quatre pans autour de la baie et une plinthe.
    expect(bays.group.children).toHaveLength(4 * 5 + 2)
    expect(meshes(bays.group).filter(isPlane)).toHaveLength(4 * 4 + 2)
    expect(meshes(doors.group).filter(isPlane)).toHaveLength(4 * 3 + 2)
  })

  it('un sol « small » : le fond sombre, puis de petites lames de parquet tournées d’un quart de tour', () => {
    const { group, materials, emptyRoom } = kit()
    emptyRoom([0, SMALL_PLANK.width * 2, 0, SMALL_PLANK.length], 'small')
    const [ground, planks] = group.children.slice(-2) as [THREE.Mesh, THREE.InstancedMesh]
    expect(ground.material).toBe(materials.floor)
    expect(ground.position.y).toBeLessThan(0)
    expect(planks.isInstancedMesh).toBe(true)
    // Deux rangées le long de z : une lame entière, puis, décalée d'un tiers, une chute et une lame coupée.
    expect(planks.count).toBe(3)
  })
})
