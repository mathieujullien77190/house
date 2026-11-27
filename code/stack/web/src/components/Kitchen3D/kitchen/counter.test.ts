import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { COUNTER_TOP, KITCHEN, PARTITION, ROOM } from '@/components/Kitchen3D/constants'
import { counterObjects } from './counter'

const built = (): THREE.Group => {
  const group = new THREE.Group()
  counterObjects(group)
  return group
}
const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}
const colorOf = (mesh: THREE.Mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex()
const boxOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.BoxGeometry).parameters
const ofColor = (group: THREE.Group, color: number) => meshesOf(group).filter((mesh) => colorOf(mesh) === color)

describe('counterObjects', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('tout est posé sur le plan de travail, dans la cuisine', () => {
    const group = built()
    group.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(group)
    // Seul le bloc à couteaux, penché, mord d'un cheveu sous le dessus du plan.
    expect(bounds.min.y).toBeGreaterThan(COUNTER_TOP - 0.01)
    expect(bounds.max.y).toBeLessThan(COUNTER_TOP + 0.45)
    expect(bounds.min.x).toBeGreaterThan(KITCHEN.xMin)
    expect(bounds.max.x).toBeLessThan(ROOM.xMax)
    expect(bounds.min.z).toBeGreaterThanOrEqual(KITCHEN.zMin - 0.01)
    expect(bounds.max.z).toBeLessThan(KITCHEN.zMax)
  })

  it('le four à micro-ondes blanc au bout du plan, côté fenêtres, sa porte vitrée vers la cuisine', () => {
    const group = built()
    const [body, glass] = group.children as THREE.Mesh[]
    expect(boxOf(body)).toMatchObject({ width: 0.36, height: 0.28, depth: 0.48 })
    expect(body.position.x).toBeCloseTo(ROOM.xMax - 0.22)
    expect(body.position.y - 0.14).toBeCloseTo(COUNTER_TOP + 0.01)
    expect(glass.position.x).toBeLessThan(body.position.x - 0.18)
  })

  it('le grille-pain et la bouilloire rouge à sa gauche : le chrome et le noir sont partagés d’un objet à l’autre', () => {
    const group = built()
    const chrome = ofColor(group, 0xd5d8dc)
    // Le corps du grille-pain, les deux montants et la grille, puis le couvercle de la bouilloire.
    expect(chrome).toHaveLength(5)
    expect(new Set(chrome.map((mesh) => mesh.material)).size).toBe(1)
    const dark = ofColor(group, 0x17181b)
    // Grille-pain : son socle, deux fentes, sa manette ; bouilloire : son socle, son bouton, trois morceaux d'anse ; le tapis des épices.
    expect(dark).toHaveLength(10)
    expect(new Set(dark.map((mesh) => mesh.material)).size).toBe(1)
    const red = ofColor(group, 0xa8202b)
    expect(red.map((mesh) => mesh.geometry.type)).toEqual(['CylinderGeometry', 'BoxGeometry'])
    // Le bec est penché, du côté opposé à l'anse.
    const [body, spout] = red
    expect(spout.rotation.z).toBe(0.5)
    expect(spout.position.x).toBeGreaterThan(body.position.x)
    const handle = group.children.slice(-3) as THREE.Mesh[]
    for (const part of handle) {
      expect(part.material).toBe(dark[0].material)
      expect(part.position.x).toBeLessThan(body.position.x)
      expect(part.position.z).toBe(body.position.z)
    }
    // La bouilloire est entre le grille-pain et le fond de la cuisine.
    expect(body.position.z).toBeLessThan(chrome[0].position.z)
  })

  it('la planche à découper : en bois clair, à rigole, à plat sur le plan', () => {
    const group = built()
    const grooves = ofColor(group, 0xb89766)
    expect(grooves).toHaveLength(4)
    const board = (group.children as THREE.Mesh[]).find((mesh) => mesh.geometry?.type === 'BoxGeometry' && boxOf(mesh).width === 0.46) as THREE.Mesh
    expect(board.position.y - 0.009).toBeCloseTo(COUNTER_TOP)
    for (const groove of grooves) {
      expect(groove.position.y).toBeGreaterThan(board.position.y + 0.009)
      expect(Math.abs(groove.position.x - board.position.x)).toBeLessThan(0.23)
    }
  })

  it('le plateau du coin : la lavande (neuf brins, toujours les mêmes) dans son pot gris, et le panier aux deux bananes', () => {
    const group = built()
    const sprigs = group.children.filter((child) => child.type === 'Group')
    expect(sprigs).toHaveLength(9)
    const pot = ofColor(group, 0x6f747b)[0]
    for (const sprig of sprigs) {
      expect(sprig.children).toHaveLength(3)
      expect([sprig.position.x, sprig.position.z]).toEqual([pot.position.x, pot.position.z])
      // La fleur est au bout de la tige.
      expect(sprig.children[2].position.y).toBeGreaterThan(sprig.children[0].position.y * 2)
    }
    expect(ofColor(group, 0x8a6fc9)).toHaveLength(9)
    // Le tirage est répétable : les brins penchent de la même façon à chaque ouverture, chacun à sa manière.
    const leans = (root: THREE.Group) => root.children.filter((child) => child.type === 'Group').map((child) => child.rotation.x)
    expect(leans(built())).toEqual(leans(group))
    expect(new Set(leans(group)).size).toBe(9)
    const bananas = ofColor(group, 0xe8c63a)
    expect(bananas.map((fruit) => fruit.geometry.type)).toEqual(['CapsuleGeometry', 'CapsuleGeometry'])
    // Le plateau est dans le coin du fond, côté fenêtres.
    expect(pot.position.x).toBeGreaterThan(ROOM.xMax - 0.3)
    expect(pot.position.z).toBeLessThan(KITCHEN.zMin + 0.3)
  })

  it('le coin du bar : cinq couteaux dans leur bloc, douze pots à épices, l’essuie-tout debout, le pot des ustensiles', () => {
    const group = built()
    const cornerX = KITCHEN.xMin + PARTITION.ledge
    const inox = ofColor(group, 0xb9bcc0)
    expect(new Set(inox.map((mesh) => mesh.material)).size).toBe(1)
    const cylinders = inox.filter((mesh) => mesh.geometry.type === 'CylinderGeometry')
    // Cinq manches, de plus en plus courts, puis trois rangées de quatre pots inclinés.
    const knives = cylinders.slice(0, 5)
    expect(knives.map((knife) => (knife.geometry as THREE.CylinderGeometry).parameters.height)).toEqual([0.11, 0.1, 0.09, 0.08, 0.07].map((tall) => expect.closeTo(tall)))
    const jars = cylinders.slice(5)
    expect(jars).toHaveLength(12)
    expect(new Set(jars.map((jar) => jar.position.y.toFixed(3))).size).toBe(3)
    expect(new Set(jars.map((jar) => jar.position.z.toFixed(3))).size).toBe(4)
    // Le rouleau et son tube de carton, au même endroit, debout dans le plateau vert.
    const roll = ofColor(group, 0xf4f4f1)[0]
    const core = ofColor(group, 0xb8946a)[0]
    expect(core.position.toArray()).toEqual(roll.position.toArray())
    expect(ofColor(group, 0x6f8f1e)).toHaveLength(5)
    // Le fouet est en fil de fer, au-dessus du pot.
    const whisk = meshesOf(group).find((mesh) => (mesh.material as THREE.MeshStandardMaterial).wireframe) as THREE.Mesh
    expect(whisk.scale.y).toBe(1.9)
    expect(whisk.position.y).toBeGreaterThan(COUNTER_TOP + 0.14)
    // Tout ce coin longe le mur du bar.
    for (const mesh of [...cylinders, roll, whisk]) expect(mesh.position.x).toBeGreaterThan(cornerX)
    for (const mesh of [...cylinders, roll]) expect(mesh.position.x).toBeLessThan(cornerX + 0.3)
  })
})
