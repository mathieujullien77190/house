import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { CABINET, COUNTER_TOP, HOB, HOOD, RUNS, SINK, SPLASH } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import { run } from './runs'

/** Les trois files de la cuisine, et le groupe de la hotte. */
const built = () => {
  const materials = kitchenMaterials(kitchenMaps())
  const hoodParts = new THREE.Group()
  const [back, right, left] = RUNS.map((spec) => run(materials, spec, hoodParts))
  return { materials, hoodParts, back, right, left }
}
const lengthOf = (index: number) => RUNS[index].modules.reduce((sum, module) => sum + module.width, 0)
const worktopOf = (line: THREE.Object3D) => line.children.find((child) => (child as THREE.Mesh).geometry?.type === 'ExtrudeGeometry') as THREE.Mesh
const boxOf = (mesh: THREE.Object3D) => ((mesh as THREE.Mesh).geometry as THREE.BoxGeometry).parameters

describe('run', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('chaque file est à sa place, tournée, ses caissons posés bout à bout sous un plan de sa longueur', () => {
    const { back, right, left } = built()
    for (const [index, line] of [back, right, left].entries()) {
      const spec = RUNS[index]
      expect([line.position.x, line.position.z, line.rotation.y]).toEqual([spec.x, spec.z, spec.angle])
      const bounds = new THREE.Box3().setFromBufferAttribute(worktopOf(line).geometry.getAttribute('position') as THREE.BufferAttribute)
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(lengthOf(index))
      // Le plan vient juste après les caissons.
      expect(line.children[spec.modules.length]).toBe(worktopOf(line))
    }
    // Le premier caisson est centré sur sa demi-largeur.
    expect(back.children.slice(0, 4).map((child) => child.position.x)).toEqual([0.2, 0.7, 1.1, 1.4].map((x) => expect.closeTo(x)))
    expect(left.children.slice(0, 5).map((child) => child.position.x)).toEqual([0.1, 0.65, 1.3, 1.7, 2.215].map((x) => expect.closeTo(x)))
  })

  it('la file des fenêtres porte l’évier, devant un plan échancré, et un panneau de bout', () => {
    const { right, back, left } = built()
    const outline = (line: THREE.Object3D) => ((worktopOf(line).geometry as THREE.ExtrudeGeometry).parameters.shapes as THREE.Shape).getPoints()
    expect(outline(back)).toHaveLength(5)
    expect(outline(left)).toHaveLength(5)
    expect(outline(right)).toHaveLength(9)
    // Quatre caissons, le plan, l'évier, le panneau.
    expect(right.children).toHaveLength(7)
    const sink = right.children[5]
    // Au milieu du deuxième caisson, son bord au-dessus du plan.
    expect(sink.position.x).toBeCloseTo(0.9)
    const rim = sink.children[0]
    expect(rim.position.y + boxOf(rim).height / 2).toBeCloseTo(COUNTER_TOP + SINK.above)
    expect(right.children.at(-1)?.position.x).toBeCloseTo(lengthOf(1))
    // Les autres files n'ont ni évier ni panneau.
    expect(left.children).toHaveLength(RUNS[2].modules.length + 1)
  })

  it('la file du fond porte la plaque, la crédence en inox et la hotte, dans son groupe', () => {
    const { materials, hoodParts, back } = built()
    const ovenX = 0.4 + 0.6 / 2
    // Quatre caissons, le plan, la plaque, la crédence, le groupe de la hotte.
    expect(back.children).toHaveLength(8)
    const [plate, splash, hoodGroup] = back.children.slice(5)
    expect(RUNS[0].modules[HOB.module].kind).toBe('oven')
    expect(plate.position.x).toBeCloseTo(ovenX)
    expect(plate.position.y).toBe(COUNTER_TOP)
    expect(plate.children).toHaveLength(6)
    expect((splash as THREE.Mesh).material).toBe(materials.steel)
    expect(boxOf(splash)).toMatchObject({ width: SPLASH.width, height: SPLASH.height })
    expect(splash.position.y - SPLASH.height / 2).toBeCloseTo(COUNTER_TOP)
    expect(splash.position.z).toBeCloseTo(-CABINET.depth + 0.005)
    // La hotte se cache à part : elle est seule dans son groupe, au-dessus de la plaque.
    expect(hoodGroup).toBe(hoodParts)
    expect(hoodParts.parent).toBe(back)
    expect(hoodParts.children).toHaveLength(1)
    expect(hoodParts.children[0].position.x).toBeCloseTo(ovenX)
    expect(hoodParts.children[0].position.z).toBeCloseTo(-CABINET.depth + HOOD.depthBottom / 2)
  })
})
