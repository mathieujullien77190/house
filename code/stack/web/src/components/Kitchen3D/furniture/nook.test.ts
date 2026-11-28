import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { KITCHEN, LAYOUT, NICHES, NOOK_WINDOW, RECESS, ROOM } from '@/components/Kitchen3D/constants'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { nook } from './nook'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

const tagged = (root: THREE.Object3D, tag: string): THREE.Object3D[] => {
  const found: THREE.Object3D[] = []
  root.traverse((child) => {
    if (child.userData[tag] !== undefined) found.push(child)
  })
  return found
}

/** Les cotes d'un pavé (vides pour une géométrie fondue : une lame de volet). */
const sizeOf = (mesh: THREE.Mesh) => (mesh.geometry as Partial<THREE.BoxGeometry>).parameters ?? ({} as THREE.BoxGeometry['parameters'])

describe('nook', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  const build = () => {
    const m = furnitureMaterials()
    const group = nook(m)
    group.updateMatrixWorld(true)
    return { m, group, meshes: meshesOf(group) }
  }

  it('la table de bistrot sous la fenêtre et ses deux chaises paillées face à face', () => {
    const { m, group, meshes } = build()
    const { x, z } = LAYOUT.bistro
    expect(meshes[0].material).toBe(m.woodOld)
    expect(meshes[0].position.toArray()).toEqual([x, 0.74, z])
    const chairs = group.children.filter((child) => child.type === 'Group' && child.position.y === 0 && child.position.z === z)
    expect(chairs.map((chair) => chair.position.x)).toEqual([x - 0.6, x + 0.6].map((at) => expect.closeTo(at)))
    // Chacune regarde la table.
    expect(chairs[0].rotation.y).toBeCloseTo(Math.PI / 2)
    expect(chairs[1].rotation.y).toBeCloseTo(-Math.PI / 2)
  })

  it('la pendule au-dessus du frigo : deux aiguilles autour du même centre, son cadran dessiné', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    const { group } = build()
    const hands = tagged(group, 'clockHand')
    expect(hands.map((hand) => hand.userData.clockHand)).toEqual(['hour', 'minute'])
    expect(hands[0].position.toArray()).toEqual(hands[1].position.toArray())
    expect(hands[0].position.x).toBe(LAYOUT.fridge.x)
    expect(hands[0].position.z).toBeCloseTo(KITCHEN.zMax - 0.038)
    // La grande aiguille est plus longue que la petite.
    const lengthOf = (hand: THREE.Object3D) => sizeOf(hand.children[0] as THREE.Mesh).height
    expect(lengthOf(hands[1])).toBeGreaterThan(lengthOf(hands[0]))
    const texts = (context.fillText.mock.calls as [string, number, number][]).map(([text]) => text)
    expect(texts).toEqual([...Array.from({ length: 12 }, (_, index) => String(index + 1)), 'Q U A R T Z'])
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 6)
  })

  it('le frigo noir devant le mur de l’escalier, tourné vers la cuisine, ses dix-huit aimants sur la façade', () => {
    const { m, group } = build()
    const fridge = group.children.find((child) => child.type === 'Group' && child.position.x === LAYOUT.fridge.x && child.userData.clockHand === undefined) as THREE.Group
    expect(fridge.position.z).toBeCloseTo(KITCHEN.zMax + 0.25)
    expect(fridge.rotation.y).toBeCloseTo(-Math.PI / 2)
    const [body, , ...magnets] = fridge.children as THREE.Mesh[]
    expect(body.material).toBe(m.black)
    expect(sizeOf(body).height).toBe(1.85)
    expect(magnets).toHaveLength(18)
    for (const magnet of magnets) {
      expect(magnet.position.x).toBe(-0.303)
      expect(magnet.position.y).toBeGreaterThanOrEqual(0.8)
      expect(magnet.position.y).toBeLessThan(1.75)
      expect(Math.abs(magnet.position.z)).toBeLessThanOrEqual(0.24)
    }
  })

  it('le cellier : cinq niveaux d’étagères en U, garnis, et quatre oiseaux en fil de fer au-dessus', () => {
    const { m, meshes } = build()
    const niche = NICHES.find((item) => item.id === 'cellar') as (typeof NICHES)[number]
    const backs = meshes.filter((mesh) => mesh.material === m.white && sizeOf(mesh).width === niche.inner && sizeOf(mesh).depth === 0.2)
    expect(backs.map((shelf) => shelf.position.y)).toEqual([0.42, 0.78, 1.14, 1.5, 1.86].map((y) => expect.closeTo(y)))
    for (const shelf of backs) expect(shelf.position.x).toBe(niche.x)
    const birds = meshes.filter((mesh) => mesh.geometry.type === 'TorusGeometry' && (mesh.geometry as THREE.TorusGeometry).parameters.radius === 0.035)
    expect(birds).toHaveLength(4)
    for (const bird of birds) expect(bird.position.y).toBeGreaterThan(niche.height)
    // Sur chaque niveau : cinq bocaux ou boîtes au fond, un bocal sur chaque bras. Les boîtes n'ont pas de couvercle d'inox.
    const lids = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && (mesh.geometry as THREE.CylinderGeometry).parameters.radiusTop === 0.047)
    const boxes = meshes.filter((mesh) => sizeOf(mesh).width === 0.07 && sizeOf(mesh).depth === 0.05 && Math.abs(mesh.position.z - lids[0].position.z) < 1e-9)
    expect(lids.length).toBeGreaterThan(0)
    expect(boxes.length).toBeGreaterThan(0)
    expect(lids.length + boxes.length).toBe(25)
    expect(new Set(lids.map((lid) => lid.material)).size).toBe(1)
    const armJars = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && (mesh.geometry as THREE.CylinderGeometry).parameters.radiusTop === 0.035 && mesh.position.z === KITCHEN.zMax + 0.2)
    expect(armJars).toHaveLength(10)
  })

  it('la niche à verres : sa tablette de chêne, deux étagères hautes, et le cadre du casier carré dessous', () => {
    const { m, meshes } = build()
    const niche = NICHES.find((item) => item.id === 'bar') as (typeof NICHES)[number]
    const ledge = meshes.find((mesh) => mesh.material === m.woodLight && sizeOf(mesh).width === niche.width + 0.02) as THREE.Mesh
    expect(ledge.position.x).toBe(niche.x)
    expect(ledge.position.y).toBe(niche.bottom)
    const shelves = meshes.filter((mesh) => mesh.material === m.woodLight && sizeOf(mesh).width === niche.inner - 0.04)
    expect(shelves.map((shelf) => shelf.position.y)).toEqual([1.6, 1.88])
    // Trois verres à pied en bas (trois pièces chacun) ; en haut huit verres retournés, trois piles et la carafe.
    const stems = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && (mesh.geometry as THREE.CylinderGeometry).parameters.radiusTop === 0.004)
    expect(stems).toHaveLength(3)
    for (const stem of stems) expect(stem.position.y).toBeLessThan(1.88)
    const tumblers = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && (mesh.geometry as THREE.CylinderGeometry).parameters.height === 0.075)
    expect(tumblers).toHaveLength(8)
    for (const tumbler of tumblers) expect(tumbler.position.y).toBeGreaterThan(1.88)
    // Le casier : quatre baguettes au nu du mur.
    const frame = meshes.filter((mesh) => mesh.position.z === KITCHEN.zMax && mesh.position.x > niche.x - RECESS.width / 2 - 0.01 && mesh.position.y > RECESS.bottom && mesh.position.y < RECESS.top && sizeOf(mesh).depth === 0.02)
    expect(frame).toHaveLength(4)
  })

  it('la fenêtre du coin repas, dans le mur nord, reliée au volet de la cuisine', () => {
    const { group } = build()
    const [slats] = tagged(group, 'shutter')
    expect(slats.userData.shutter).toBe('cuisine')
    expect(slats.userData.area).toBeCloseTo(NOOK_WINDOW.width * NOOK_WINDOW.height)
    expect(slats.parent?.position.x).toBeCloseTo(ROOM.xMax + 0.025)
    expect(slats.parent?.position.z).toBe(NOOK_WINDOW.z)
  })

  it('le même décor à chaque ouverture (les tirages sont répétables)', () => {
    const places = () => build().meshes.map((mesh) => [...mesh.position.toArray(), sizeOf(mesh).height])
    expect(places()).toEqual(places())
  })
})
