import * as THREE from 'three'
import { stubCanvasContext } from '@/test/canvas'
import { BASE, CABINET, CAGE_CAMERA, GARDEN_CAMERA, HOOD, LAMP_FIXTURES, MAST_CAMERA, RUNS } from './constants'
import { buildScene } from './helpers'
import { acMeshes, cameraMeshes } from './live'
import { SHUTTER_KEYS, shutterWindows } from './shutters'

const meshesOf = (root: THREE.Object3D): THREE.Mesh[] => {
  const meshes: THREE.Mesh[] = []
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  return meshes
}

describe('buildScene', () => {
  beforeEach(() => {
    stubCanvasContext(null)
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture<HTMLImageElement>())
  })

  it('la maison, le mobilier, le jardin et les trois files de caissons', () => {
    const { root } = buildScene()
    expect(root.children).toHaveLength(3 + RUNS.length)
    // Le jardin est plus bas que le sol de la maison.
    expect(root.children[2].position.y).toBe(-BASE.rise)
    const runs = root.children.slice(3)
    expect(runs.map((run) => [run.position.x, run.position.z, run.rotation.y])).toEqual(RUNS.map((spec) => [spec.x, spec.z, spec.angle]))
    // Tout maillage reçoit les ombres ; seules les ampoules des luminaires n'en portent pas.
    const meshes = meshesOf(root)
    expect(meshes.length).toBeGreaterThan(1500)
    // Une ampoule par lampe Hue nommée dans la scène.
    const bulbs = meshes.filter((mesh) => mesh.userData.fixture === true)
    expect(bulbs.map((bulb) => bulb.userData.fixtureName as string).sort()).toEqual([...LAMP_FIXTURES].sort())
    for (const mesh of meshes) {
      expect(mesh.receiveShadow).toBe(true)
      expect(mesh.castShadow).toBe(mesh.userData.fixture !== true)
    }
  })

  it('ce qui se clique est dans la scène : trois clims, trois caméras, une fenêtre par volet relié', () => {
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
    ).toEqual([CAGE_CAMERA, GARDEN_CAMERA, MAST_CAMERA].sort())
    expect(new Set(shutterWindows(root).map((window) => window.key))).toEqual(new Set(SHUTTER_KEYS))
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
  })
})
