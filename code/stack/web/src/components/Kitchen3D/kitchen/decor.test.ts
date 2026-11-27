import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { COUNTER_TOP, KITCHEN, ROOM, TILES, WINDOWS } from '@/components/Kitchen3D/constants'
import { kitchenMaps, kitchenMaterials } from '@/components/Kitchen3D/materials'
import { kitchenDecor, kitchenPendant } from './decor'

const boxOf = (mesh: THREE.Object3D) => ((mesh as THREE.Mesh).geometry as THREE.BoxGeometry).parameters
const planeOf = (mesh: THREE.Object3D) => ((mesh as THREE.Mesh).geometry as THREE.PlaneGeometry).parameters

describe('kitchenDecor', () => {
  const built = () => {
    const maps = kitchenMaps()
    const materials = kitchenMaterials(maps)
    const group = new THREE.Group()
    kitchenDecor(group, materials, maps)
    return { maps, materials, group }
  }

  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('la crédence : deux pans de carrelage au-dessus du plan, chacun avec sa copie de la texture répétée sur sa longueur', () => {
    const { maps, materials, group } = built()
    const [back, right] = group.children as THREE.Mesh[]
    expect(planeOf(back)).toMatchObject({ width: KITCHEN.xMax - KITCHEN.xMin, height: TILES.height })
    expect(planeOf(right)).toMatchObject({ width: 2.5, height: TILES.height })
    for (const pane of [back, right]) expect(pane.position.y - TILES.height / 2).toBeCloseTo(COUNTER_TOP)
    // Le fond est devant le mur de la hotte ; l'autre, tourné vers la cuisine, devant le mur des fenêtres.
    expect(back.position.z).toBeGreaterThan(KITCHEN.zMin)
    expect(right.position.x).toBeLessThan(ROOM.xMax)
    expect(right.rotation.y).toBeCloseTo(-Math.PI / 2)
    const [backMap, rightMap] = [back, right].map((pane) => (pane.material as THREE.MeshStandardMaterial).map as THREE.Texture)
    expect(backMap).not.toBe(rightMap)
    expect(backMap).not.toBe(maps.tile)
    expect(back.material).not.toBe(materials.tile)
    // Un carreau de 60 cm de motif.
    expect(backMap.repeat.x).toBeCloseTo((KITCHEN.xMax - KITCHEN.xMin) / 0.6)
    expect(rightMap.repeat.x).toBeCloseTo(2.5 / 0.6)
    expect(rightMap.repeat.y).toBeCloseTo(TILES.height / 0.6)
    // La texture d'origine n'est pas touchée.
    expect(maps.tile.repeat.toArray()).toEqual([1, 1])
  })

  it('deux étagères de bois sur leurs équerres noires, de part et d’autre de la hotte', () => {
    const { materials, group } = built()
    const shelves = group.children.slice(2, 4)
    expect(shelves.map((shelf) => [shelf.position.x, boxOf(shelf.children[0]).width])).toEqual([
      [-0.85, 0.9],
      [0.75, 1.1],
    ])
    for (const shelf of shelves) {
      expect(shelf.position.y).toBe(1.72)
      // Contre le mur du fond.
      expect(shelf.position.z - 0.1).toBeCloseTo(KITCHEN.zMin)
      const [board, ...brackets] = shelf.children as THREE.Mesh[]
      expect(board.material).toBe(materials.shelf)
      expect(brackets).toHaveLength(2)
      for (const bracket of brackets) {
        expect(bracket.material).toBe(materials.bracket)
        expect(bracket.position.y).toBeLessThan(0)
      }
      expect(brackets[0].position.x).toBeCloseTo(-brackets[1].position.x)
    }
  })

  it('deux petites fenêtres dans le mur nord : un cadre dans l’embrasure, une vitre, un store crème baissé', () => {
    const { materials, group } = built()
    const windows = group.children.slice(4)
    expect(windows.map((frame) => frame.position.z)).toEqual(WINDOWS.z)
    for (const frame of windows) {
      expect(frame.position.y).toBeCloseTo(WINDOWS.bottom + WINDOWS.height / 2)
      // Sa face ressort d'un centimètre dans la pièce.
      expect(frame.position.x - 0.035).toBeCloseTo(ROOM.xMax - 0.01)
      const parts = frame.children as THREE.Mesh[]
      expect(parts.filter((part) => part.material === materials.windowFrame)).toHaveLength(4)
      const glass = parts.find((part) => part.material === materials.glass) as THREE.Mesh
      expect(planeOf(glass)).toMatchObject({ width: expect.closeTo(WINDOWS.width - 0.1), height: expect.closeTo(WINDOWS.height - 0.1) })
      // Le store et son rouleau, côté pièce (vers -x).
      const blind = parts.filter((part) => part.material === materials.blind)
      expect(blind).toHaveLength(2)
      for (const part of blind) expect(part.position.x).toBeLessThan(0)
      expect(boxOf(blind[0]).height).toBeCloseTo(WINDOWS.height - 0.1)
    }
    expect(group.children).toHaveLength(6)
  })
})

describe('kitchenPendant', () => {
  it('une coupole noire, son ampoule « cuisine 1 » dedans, et un câble jusqu’au plafond', () => {
    stubCanvasContext(null)
    const materials = kitchenMaterials(kitchenMaps())
    const group = new THREE.Group()
    kitchenPendant(group, materials)
    const [dome, bulb, cord] = group.children as THREE.Mesh[]
    expect(group.children).toHaveLength(3)
    expect(dome.material).toBe(materials.lamp)
    // Une demi-sphère, ouverte vers le bas.
    expect((dome.geometry as THREE.SphereGeometry).parameters.thetaLength).toBeCloseTo(Math.PI / 2)
    expect(bulb.userData).toMatchObject({ fixture: true, fixtureName: 'cuisine 1' })
    expect(bulb.material).not.toBe(materials.lamp)
    expect([bulb.position.x, bulb.position.z]).toEqual([dome.position.x, dome.position.z])
    expect(bulb.position.y).toBeLessThan(dome.position.y + 0.26)
    expect(cord.position.y + boxOf(cord).height / 2).toBeCloseTo(ROOM.height)
    expect(cord.position.y - boxOf(cord).height / 2).toBeCloseTo(2.1)
  })
})
