import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { APPLE_BACK_CAMERA, APPLE_CAMERA, BASE, CABINET, CAGE_CAMERA, GARDEN_CAMERA, HOOD, INNER_CAGE_CAMERA, LAMP_FIXTURES, MAST_CAMERA, QUALITY, RUNS } from './constants'
import { buildScene } from './helpers'
import { acMeshes, cameraMeshes } from './live'
import { KINDS } from './merge'
import { SHUTTER_KEYS, shutterWindows } from './shutters'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

/** Les bouquets d'herbe : le seul maillage de copies fait de rubans (ni pavé ni caillou), teinté copie par copie. */
const grassOf = (root: THREE.Object3D): THREE.InstancedMesh => meshesOf(root).find((mesh) => (mesh as THREE.InstancedMesh).isInstancedMesh && mesh.geometry.type === 'BufferGeometry' && (mesh as THREE.InstancedMesh).instanceColor !== null) as THREE.InstancedMesh

describe('buildScene', () => {
  beforeEach(() => {
    stubCanvasContext(null)
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture<HTMLImageElement>())
  })

  it('la maison, le mobilier, le jardin et les trois files de caissons, puis tout ce qui ne bouge pas, fondu', () => {
    const { root } = buildScene()
    expect(root.children).toHaveLength(3 + RUNS.length + 1)
    // Le jardin est plus bas que le sol de la maison.
    expect(root.children[2].position.y).toBe(-BASE.rise)
    const runs = root.children.slice(3, 3 + RUNS.length)
    expect(runs.map((run) => [run.position.x, run.position.z, run.rotation.y])).toEqual(RUNS.map((spec) => [spec.x, spec.z, spec.angle]))
    expect(root.children.at(-1)?.name).toBe('static')
    // Chaque partie porte son genre, que la vue Matrix et la fonte par genre retrouvent.
    expect(root.children.slice(0, 3).map((part) => part.name)).toEqual(['shell', 'furniture', 'garden'])
    const meshes = meshesOf(root)
    // Une ampoule par lampe Hue nommée dans la scène, plus la lanterne de l'entrée, qui n'est reliée à aucune lampe.
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName as string | undefined).filter((name) => name !== undefined).sort()).toEqual([...LAMP_FIXTURES].sort())
    expect(bulbs.filter((bulb) => bulb.userData.fixtureName === undefined)).toHaveLength(1)
    // Tout maillage reçoit les ombres ; n'en portent pas : les ampoules des luminaires et les petites choses du jardin marquées.
    for (const mesh of meshes) {
      expect(mesh.receiveShadow).toBe(true)
      expect(mesh.castShadow).toBe(mesh.userData.fixture !== true && mesh.userData.noShadow !== true)
    }
    expect(meshes.filter((mesh) => mesh.userData.noShadow === true).length).toBeGreaterThan(20)
    expect(meshes.filter((mesh) => mesh.castShadow).length).toBeGreaterThan(400)
  })

  it('peu d’appels de dessin : quelques centaines de maillages pour toute la scène, et les matériaux identiques n’en font qu’un', () => {
    const { root } = buildScene()
    const meshes = meshesOf(root)
    // (Plus de 7 000 avant que les plantes soient dessinées par lots et que ce qui ne bouge pas soit fondu par matériau.)
    expect(meshes.length).toBeGreaterThan(300)
    expect(meshes.length).toBeLessThan(700)
    expect(new Set(meshes.map((mesh) => mesh.material)).size).toBeLessThan(360)
    // Le groupe fondu : des maillages simples et opaques, sans marque, un par matériau (ou presque : un par jeu d'attributs).
    const fused = root.children.at(-1) as THREE.Group
    expect(fused.children.length).toBeGreaterThan(100)
    for (const child of fused.children as THREE.Mesh<THREE.BufferGeometry, THREE.Material>[]) {
      expect(child.isMesh).toBe(true)
      expect(child.material.transparent).toBe(false)
      expect(child.userData).toEqual({})
    }
    // Un maillage par matériau et par genre (le nom du groupe qui les portait) : pas deux fois le même couple.
    const pairs = (fused.children as THREE.Mesh[]).map((child) => [child.material, child.name] as const)
    expect(new Set(pairs.map(([material, kind]) => `${(material as THREE.Material).uuid} ${kind}`)).size).toBeGreaterThan(fused.children.length - 10)
    expect(new Set(pairs.map(([, kind]) => kind))).toEqual(new Set(KINDS))
    // Une ampoule et un voyant de clim gardent leur propre matériau : leur couleur suit la maison.
    const own = meshes.filter((mesh) => mesh.userData.fixture === true || mesh.userData.acLed !== undefined)
    expect(new Set(own.map((mesh) => mesh.material)).size).toBe(own.length)
  })

  it('ce qui se clique est dans la scène : trois clims, six caméras, une fenêtre par volet relié, restée entière', () => {
    const { root } = buildScene()
    expect(
      acMeshes(root)
        .map((unit) => unit.id)
        .sort(),
    ).toEqual(['chambre-invite', 'chambre-matou', 'salon'])
    expect(
      cameraMeshes(root)
        .map((camera) => camera.name)
        .sort(),
    ).toEqual([APPLE_BACK_CAMERA, APPLE_CAMERA, CAGE_CAMERA, GARDEN_CAMERA, INNER_CAGE_CAMERA, MAST_CAMERA].sort())
    const windows = shutterWindows(root)
    expect(new Set(windows.map((window) => window.key))).toEqual(new Set(SHUTTER_KEYS))
    for (const { object } of windows) {
      // Son cadre (quatre montants au moins), sa vitre et ses lames sont toujours dans son groupe : on la clique en entier.
      const frame = object.children.filter((child) => (child as THREE.Mesh).isMesh)
      expect(frame.length).toBeGreaterThanOrEqual(5)
      expect(object.children.some((child) => child.userData.shutter !== undefined && child.children.length > 10)).toBe(true)
    }
    // Chaque caméra garde son modèle.
    for (const camera of cameraMeshes(root)) expect(meshesOf(camera.object).length).toBeGreaterThan(2)
  })

  it('la hotte est au-dessus de la plaque, dans la file du fond, dans son propre groupe', () => {
    const { root, hood } = buildScene()
    const back = root.children[3]
    expect(hood.parent).toBe(back)
    expect(hood.children).toHaveLength(1)
    const [parts] = hood.children
    // Le four est le deuxième caisson du fond (40 cm puis 60 cm) : son milieu est à 70 cm.
    expect(parts.position.x).toBeCloseTo(0.7)
    expect(parts.position.z).toBeCloseTo(-CABINET.depth + HOOD.depthBottom / 2)
    // Elle garde ses maillages : la cacher la cache toujours.
    expect(meshesOf(hood).length).toBeGreaterThanOrEqual(3)
  })

  it('sur téléphone : la même scène, avec moins de bouquets d’herbe et des haies sans feuilles ni fleurs', () => {
    const desk = buildScene(QUALITY.desktop)
    const phone = buildScene(QUALITY.phone)
    expect(grassOf(buildScene().root).count).toBe(grassOf(desk.root).count)
    expect(grassOf(phone.root).count).toBeLessThan(grassOf(desk.root).count * 0.65)
    expect(grassOf(phone.root).count).toBeGreaterThan(grassOf(desk.root).count * 0.35)
    // Les haies n'ont plus que leur bloc vert : leurs maillages de feuilles et de fleurs ne sont pas dessinés.
    expect(meshesOf(phone.root).length).toBeLessThan(meshesOf(desk.root).length)
    expect(phone.root.children.map((part) => part.name)).toEqual(desk.root.children.map((part) => part.name))
  })
})
