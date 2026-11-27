import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { CABINET, COUNTER_TOP } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import type { ModuleKind } from '@/components/Kitchen3D/types'
import { cabinet, endPanel } from './units'

const materials = () => kitchenMaterials(kitchenMaps())
const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}
const boxOf = (mesh: THREE.Object3D) => ((mesh as THREE.Mesh).geometry as THREE.BoxGeometry).parameters
const groupsOf = (unit: THREE.Object3D) => unit.children.filter((child) => child.type === 'Group')
const unit = (kind: ModuleKind, width = 0.6) => cabinet(materials(), { kind, width }, 1.5)

describe('cabinet', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('un caisson à porte : le socle en retrait, le corps, une façade à cadre et une poignée coquille debout près du bord', () => {
    const all = materials()
    const door = cabinet(all, { kind: 'door', width: 0.6 }, 1.5)
    expect(door.position.x).toBe(1.5)
    const [plinth, carcass, front, handle] = door.children
    expect(door.children).toHaveLength(4)
    expect((plinth as THREE.Mesh).material).toBe(all.plinth)
    expect(boxOf(plinth)).toMatchObject({ width: expect.closeTo(0.6 - CABINET.gap), height: CABINET.plinth })
    // Le socle est en retrait de la façade.
    expect(plinth.position.z + boxOf(plinth).depth / 2).toBeCloseTo(-CABINET.plinthSetback)
    expect(boxOf(carcass).height).toBe(CABINET.body)
    expect(carcass.position.y).toBeCloseTo(CABINET.plinth + CABINET.body / 2)
    // La façade : un fond en retrait et quatre bandes de cadre, toutes du bleu des portes.
    expect(front.children).toHaveLength(5)
    for (const part of front.children) expect((part as THREE.Mesh).material).toBe(all.door)
    expect(boxOf(front.children[1]).height).toBeCloseTo(CABINET.frame)
    expect(front.children[0].position.z).toBeLessThan(front.children[1].position.z)
    expect(front.position.y).toBeCloseTo(CABINET.plinth + CABINET.body / 2)
    // La poignée : debout, en haut, près du bord.
    expect(handle.children[0].rotation.z).toBe(0)
    expect((handle.children[0] as THREE.Mesh).material).toBe(all.nickel)
    expect(handle.position.x).toBeCloseTo((0.6 - CABINET.gap) / 2 - 0.06)
    expect(handle.position.y).toBeCloseTo(CABINET.plinth + CABINET.body - 0.12)
  })

  it('le lave-vaisselle : la même façade, sa poignée couchée en haut au milieu', () => {
    const dishwasher = unit('dishwasher')
    expect(groupsOf(dishwasher)).toHaveLength(2)
    const handle = dishwasher.children[3]
    expect(handle.children[0].rotation.z).toBeCloseTo(Math.PI / 2)
    expect(handle.position.x).toBe(0)
    expect(handle.position.y).toBeCloseTo(CABINET.plinth + CABINET.body - 0.07)
  })

  it('sous l’évier, le corps du caisson est plus bas', () => {
    expect(boxOf(unit('sink').children[1]).height).toBeCloseTo(CABINET.body - 0.11)
    expect(groupsOf(unit('sink'))).toHaveLength(2)
  })

  it('trois tiroirs : trois façades superposées et trois poignées couchées', () => {
    const drawers = unit('drawers', 0.9)
    const groups = groupsOf(drawers)
    expect(groups).toHaveLength(6)
    const fronts = [groups[0], groups[2], groups[4]]
    expect(fronts.map((front) => front.position.y)).toEqual([0.5, 1.5, 2.5].map((rank) => expect.closeTo(CABINET.plinth + (CABINET.body / 3) * rank)))
    for (const handle of [groups[1], groups[3], groups[5]]) expect(handle.children[0].rotation.z).toBeCloseTo(Math.PI / 2)
    expect(boxOf(fronts[0].children[0]).height).toBeCloseTo(CABINET.body / 3 - CABINET.gap)
  })

  it('le four : un tiroir bas dont le cadre s’amincit, la porte en verre noir, le bandeau inox et ses deux boutons', () => {
    const all = materials()
    const oven = cabinet(all, { kind: 'oven', width: 0.6 }, 0.7)
    // Le socle, le corps, puis le four d'un seul bloc.
    expect(oven.children).toHaveLength(3)
    const [block] = groupsOf(oven)
    const [drawer, handle, glass, fascia, bar, ...knobs] = block.children
    // Le tiroir fait 13 cm : son cadre est ramené au quart de sa hauteur.
    expect(boxOf(drawer.children[1]).height).toBeCloseTo((0.13 - CABINET.gap) / 4)
    expect(handle.children[0].rotation.z).toBeCloseTo(Math.PI / 2)
    expect((glass as THREE.Mesh).material).toBe(all.ovenGlass)
    expect((fascia as THREE.Mesh).material).toBe(all.steel)
    // Le bandeau finit en haut du caisson, la porte juste en dessous ; la barre est devant la porte.
    expect(fascia.position.y + boxOf(fascia).height / 2).toBeLessThan(CABINET.plinth + CABINET.body)
    expect(glass.position.y + boxOf(glass).height / 2).toBeLessThan(fascia.position.y)
    expect(bar.position.z).toBeGreaterThan(glass.position.z)
    expect(knobs).toHaveLength(2)
    expect(knobs.map((knob) => knob.position.x)).toEqual([-0.16, 0.16])
  })

  it('le range-bouteilles : un bloc blanc sans porte, sept tablettes, six bouteilles couchées le goulot vers l’allée', () => {
    const all = materials()
    const wine = cabinet(all, { kind: 'wine', width: 0.2 }, 0.1)
    expect(wine.children).toHaveLength(1)
    const parts = meshesOf(wine)
    const bottles = parts.filter((mesh) => mesh.material === all.bottle)
    expect(bottles).toHaveLength(12)
    for (const bottle of bottles) expect(bottle.rotation.x).toBeCloseTo(Math.PI / 2)
    // Le corps au fond, le goulot devant.
    expect(bottles[1].position.z).toBeGreaterThan(bottles[0].position.z)
    expect(bottles[1].position.y).toBe(bottles[0].position.y)
    const shelves = parts.filter((mesh) => mesh.geometry.type === 'BoxGeometry' && boxOf(mesh).height === 0.012)
    expect(shelves).toHaveLength(7)
    // Le dessous et le dessus restent dans le corps du caisson.
    expect(shelves[0].position.y).toBeCloseTo(CABINET.plinth + 0.006)
    expect(shelves[6].position.y).toBeCloseTo(CABINET.plinth + CABINET.body - 0.006)
    expect(parts.filter((mesh) => mesh.material === all.door)).toHaveLength(0)
    expect(parts.filter((mesh) => mesh.material === all.plinth)).toHaveLength(1)
  })
})

describe('endPanel', () => {
  it('un panneau de lambris bleu sur le bout de la file, sept rainures, jusque dans l’épaisseur du plan', () => {
    stubCanvasContext(null)
    const all = materials()
    const panel = endPanel(all, 2.5)
    expect(panel.position.x).toBe(2.5)
    const [board, ...grooves] = panel.children as THREE.Mesh[]
    expect(board.material).toBe(all.door)
    expect(boxOf(board).depth).toBeCloseTo(CABINET.depth + 0.01)
    // Du haut du socle (2 cm) jusqu'au milieu de l'épaisseur du plan.
    expect(board.position.y - boxOf(board).height / 2).toBeCloseTo(0.02)
    expect(board.position.y + boxOf(board).height / 2).toBeCloseTo(COUNTER_TOP - 0.02)
    expect(grooves).toHaveLength(7)
    for (const groove of grooves) {
      expect(groove.material).toBe(all.carcass)
      expect(groove.position.z).toBeGreaterThan(-CABINET.depth)
    }
  })
})
