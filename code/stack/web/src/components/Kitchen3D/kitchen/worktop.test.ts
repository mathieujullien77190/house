import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { CABINET, COUNTER_TOP, HOB, HOOD, ROOM, SINK, WORKTOP } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import { hob, hood, sink, worktop } from './worktop'

const materials = () => kitchenMaterials(kitchenMaps())
const boxOf = (mesh: THREE.Object3D) => ((mesh as THREE.Mesh).geometry as THREE.BoxGeometry).parameters
const boundsOf = (mesh: THREE.Mesh) => new THREE.Box3().setFromBufferAttribute(mesh.geometry.getAttribute('position') as THREE.BufferAttribute)
const outlineOf = (mesh: THREE.Mesh) => ((mesh.geometry as THREE.ExtrudeGeometry).parameters.shapes as THREE.Shape).getPoints()

describe('le plan de travail et ce qu’il porte', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('le plan : une dalle de 4 cm posée sur les caissons, qui dépasse de 2 cm devant', () => {
    const all = materials()
    const top = worktop(all, 1.6, null)
    expect(top.material).toBe(all.worktop)
    // Quatre coins (le contour se referme sur le premier).
    expect(outlineOf(top)).toHaveLength(5)
    expect(top.position.y).toBeCloseTo(CABINET.plinth + CABINET.body)
    const bounds = boundsOf(top)
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(1.6)
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(WORKTOP.thickness)
    expect(top.position.y + bounds.max.y).toBeCloseTo(COUNTER_TOP)
    // Couché : du fond des caissons (z = -profondeur) jusque devant la façade.
    expect(bounds.min.z).toBeCloseTo(-CABINET.depth)
    expect(bounds.max.z).toBeCloseTo(WORKTOP.overhang)
  })

  it('devant l’évier, il est échancré : le bloc blanc remplit le creux', () => {
    const points = outlineOf(worktop(materials(), 2.5, 0.9))
    expect(points).toHaveLength(9)
    const half = SINK.width / 2 - 0.01
    expect(points.slice(1, 5).map((point) => point.x)).toEqual([0.9 - half, 0.9 - half, 0.9 + half, 0.9 + half].map((x) => expect.closeTo(x)))
    expect(points[2].y).toBeCloseTo(SINK.depth - SINK.protrusion - 0.04)
    // L'échancrure ne va pas jusqu'au fond du plan.
    expect(points[2].y).toBeLessThan(CABINET.depth)
  })

  it('l’évier de ferme : un bloc creux dont la façade dépasse et dont le bord monte au-dessus du plan, bonde et robinet en laiton', () => {
    const all = materials()
    const farmhouse = sink(all, 0.9)
    expect(farmhouse.position.x).toBe(0.9)
    const [front, back, left, right, bottom, drain, foot, spout] = farmhouse.children as THREE.Mesh[]
    expect(farmhouse.children).toHaveLength(8)
    for (const side of [front, back, left, right, bottom]) expect(side.material).toBe(all.sink)
    expect(front.position.y + boxOf(front).height / 2).toBeCloseTo(COUNTER_TOP + SINK.above)
    // La façade dépasse devant les portes (z = 0).
    expect(front.position.z + SINK.wall / 2).toBeCloseTo(SINK.protrusion)
    expect(back.position.z - SINK.wall / 2).toBeCloseTo(SINK.protrusion - SINK.depth)
    expect(left.position.x).toBeCloseTo(-right.position.x)
    // La bonde est au fond de la cuve.
    expect(drain.material).toBe(all.drain)
    expect(drain.position.y).toBeGreaterThan(bottom.position.y)
    expect(drain.position.y).toBeLessThan(COUNTER_TOP)
    // Le robinet : derrière la cuve, son col de cygne revient au-dessus d'elle.
    expect(foot.material).toBe(all.brass)
    expect(spout.material).toBe(all.brass)
    expect(foot.position.z).toBeLessThan(SINK.protrusion - SINK.depth)
    expect(spout.geometry.type).toBe('TubeGeometry')
    const reach = boundsOf(spout)
    expect(reach.max.z).toBeGreaterThan(SINK.protrusion - SINK.depth)
    expect(reach.max.y).toBeGreaterThan(COUNTER_TOP + 0.35)
  })

  it('la plaque : une vitre noire sur le plan, quatre foyers cerclés et sa commande devant', () => {
    const all = materials()
    const plate = hob(all, 0.7)
    expect(plate.position.toArray()).toEqual([0.7, COUNTER_TOP, -CABINET.depth / 2])
    const [glass, ...marks] = plate.children as THREE.Mesh[]
    expect(glass.material).toBe(all.hob)
    expect(boxOf(glass)).toMatchObject({ width: HOB.width, height: HOB.thickness, depth: HOB.depth })
    const rings = marks.filter((mark) => mark.geometry.type === 'RingGeometry')
    expect(rings).toHaveLength(4)
    for (const ring of rings) {
      expect(ring.material).toBe(all.hobRing)
      expect(ring.position.y).toBeGreaterThan(HOB.thickness)
      expect(Math.abs(ring.position.x) + (ring.geometry as THREE.RingGeometry).parameters.outerRadius).toBeLessThan(HOB.width / 2)
    }
    // Deux grands foyers en diagonale.
    expect(rings.map((ring) => (ring.geometry as THREE.RingGeometry).parameters.outerRadius)).toEqual([0.095, 0.075, 0.075, 0.095])
    const touch = marks.at(-1) as THREE.Mesh
    expect(touch.position.z).toBeGreaterThan(0.2)
    expect(marks).toHaveLength(5)
  })

  it('la hotte : trois pans d’inox adossés au mur, un conduit jusqu’au plafond, le bandeau de boutons sous le bord avant', () => {
    const all = materials()
    const extractor = hood(all, 0.7)
    expect(extractor.position.x).toBe(0.7)
    expect(extractor.position.z).toBeCloseTo(-CABINET.depth + HOOD.depthBottom / 2)
    const [canopy, duct, strip] = extractor.children as THREE.Mesh[]
    // Six triangles sur huit coins : ni face arrière ni dessous.
    expect(canopy.geometry.getIndex()?.count).toBe(18)
    expect(canopy.geometry.getAttribute('position').count).toBe(8)
    expect(canopy.geometry.getAttribute('normal').count).toBe(8)
    const bounds = boundsOf(canopy)
    expect(bounds.min.y).toBeCloseTo(HOOD.bottom)
    expect(bounds.max.y).toBeCloseTo(HOOD.bottom + HOOD.height)
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(HOOD.widthBottom)
    // Son fond est contre le mur.
    expect(extractor.position.z + bounds.min.z).toBeCloseTo(-CABINET.depth)
    expect(canopy.material).toBe(all.steel)
    expect(duct.position.y - boxOf(duct).height / 2).toBeCloseTo(HOOD.bottom + HOOD.height)
    expect(duct.position.y + boxOf(duct).height / 2).toBeCloseTo(ROOM.height)
    expect(boxOf(duct).width).toBe(HOOD.widthTop)
    expect(strip.material).toBe(all.nickel)
    expect(strip.position.z).toBeCloseTo(HOOD.depthBottom / 2 - 0.01)
  })
})
