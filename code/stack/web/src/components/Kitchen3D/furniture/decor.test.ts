import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { KITCHEN, LAYOUT, PARTITION, ROOM, SHELL } from '@/components/Kitchen3D/constants'
import { furnitureMaterials } from '@/components/Kitchen3D/materials'
import { frames, potteryShelf, teaShelf } from './decor'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('les étagères décorées', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  it('à gauche de la hotte : un ficus de quatorze boules de feuilles, la théière et quatre gobelets (deux rouges)', () => {
    const m = furnitureMaterials()
    const group = teaShelf(m)
    expect(group.position.toArray()).toEqual([-0.85, 1.735, KITCHEN.zMin + 0.1])
    const meshes = meshesOf(group)
    expect(meshes.filter((mesh) => mesh.material === m.plant)).toHaveLength(14)
    expect(meshes.filter((mesh) => mesh.material === m.red)).toHaveLength(2)
    expect(meshes.filter((mesh) => mesh.geometry.type === 'TorusGeometry')).toHaveLength(1)
    // Tout est posé sur l'étagère.
    for (const mesh of meshes) expect(mesh.position.y).toBeGreaterThan(0)
  })

  it('le ficus est le même à chaque ouverture (tirage répétable)', () => {
    const leaves = () => {
      const m = furnitureMaterials()
      return meshesOf(teaShelf(m))
        .filter((mesh) => mesh.material === m.plant)
        .map((mesh) => mesh.position.toArray())
    }
    expect(leaves()).toEqual(leaves())
  })

  it('à droite de la hotte : la coupe et ses deux citrons, cinq gobelets, quatre godets, le plat appuyé au mur', () => {
    const m = furnitureMaterials()
    const group = potteryShelf(m)
    expect(group.position.toArray()).toEqual([0.75, 1.735, KITCHEN.zMin + 0.1])
    const meshes = meshesOf(group)
    const lemons = meshes.filter((mesh) => (mesh.material as THREE.MeshStandardMaterial).color.getHex() === 0xe8c63a)
    expect(lemons.map((lemon) => lemon.position.x)).toEqual([-0.44, -0.28].map((x) => expect.closeTo(x)))
    const heightOf = (mesh: THREE.Mesh) => (mesh.geometry as THREE.CylinderGeometry).parameters.height
    const cups = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && heightOf(mesh) === 0.07 && mesh.position.z === -0.02)
    expect(cups).toHaveLength(5)
    // Grès et émail en alternance.
    expect(cups[0].material).toBe(cups[2].material)
    expect(cups[0].material).not.toBe(cups[1].material)
    expect(meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry' && heightOf(mesh) === 0.035)).toHaveLength(4)
    const leaning = meshes.filter((mesh) => Math.abs(mesh.rotation.x - (Math.PI / 2 - 0.15)) < 1e-9)
    expect(leaning).toHaveLength(2)
  })
})

describe('frames', () => {
  beforeEach(() => {
    stubCanvasContext(null)
  })

  const build = () => {
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture())
    const m = furnitureMaterials()
    const group = frames(m)
    return { load, m, group, meshes: meshesOf(group) }
  }

  it('cinq photos accrochées, venues de `public/kitchen3d/`', () => {
    const { load, meshes } = build()
    expect(load.mock.calls.map(([url]) => url)).toEqual(['puzzle.jpg', 'sea.png', 'shore.jpg', 'cows.jpg', 'city.jpg'].map((name) => `${import.meta.env.BASE_URL}kitchen3d/${name}`))
    const images = meshes.filter((mesh) => mesh.geometry.type === 'PlaneGeometry')
    expect(images).toHaveLength(5)
    for (const image of images) expect((image.material as THREE.MeshStandardMaterial).map).toBeInstanceOf(THREE.Texture)
    // La mer est détourée : son fond transparent n'est pas dessiné.
    expect(images.map((image) => (image.material as THREE.MeshStandardMaterial).alphaTest)).toEqual([0, 0.5, 0, 0, 0])
  })

  it('chaque image est devant son mur, tournée vers la pièce', () => {
    const { meshes } = build()
    const [puzzle, sea, shore, cows, city] = meshes.filter((mesh) => mesh.geometry.type === 'PlaneGeometry')
    // Le puzzle regarde la cuisine (+x), depuis le mur plein du bar.
    expect(puzzle.position.toArray()).toEqual([LAYOUT.puzzle.x + 0.022, LAYOUT.puzzle.y, LAYOUT.puzzle.z])
    expect(puzzle.rotation.y).toBeCloseTo(Math.PI / 2)
    // La mer est de l'autre côté du même mur : elle regarde le salon (−x).
    expect(sea.position.x).toBeCloseTo(SHELL.salonX - 0.003)
    expect(sea.rotation.y).toBeCloseTo(-Math.PI / 2)
    expect(shore.position.x).toBeCloseTo(ROOM.xMax - 0.0205)
    expect(shore.rotation.y).toBeCloseTo(-Math.PI / 2)
    // Les vaches, sur le bout du mur plein, face au bar.
    expect(cows.position.x).toBe(SHELL.wallX)
    expect(cows.position.z).toBeCloseTo(SHELL.barStart + 0.0165)
    expect(cows.rotation.y).toBe(0)
    // La gravure de la ville, au-dessus du buffet.
    expect(city.position.x).toBeCloseTo(ROOM.xMin + 0.021)
    expect(city.position.z).toBe(LAYOUT.sideboard.z)
  })

  it('dix-sept pots à épices en inox en rang sur le rebord du mur plein, du même matériau', () => {
    const { meshes } = build()
    const jars = meshes.filter((mesh) => mesh.geometry.type === 'CylinderGeometry')
    expect(jars).toHaveLength(17)
    expect(new Set(jars.map((jar) => jar.material)).size).toBe(1)
    for (const jar of jars) expect(jar.position.x).toBeCloseTo(KITCHEN.xMin + PARTITION.ledge / 2)
    expect(jars[0].position.z).toBeCloseTo(KITCHEN.zMin + 0.12)
    expect(jars[16].position.z).toBeCloseTo(KITCHEN.zMin + 0.12 + 16 * 0.055)
    // Posés sur le rebord (leur pied à 4 cm au-dessus du muret, sur la tablette).
    expect(jars[0].position.y - 0.045).toBeCloseTo(PARTITION.height + 0.04)
  })
})
