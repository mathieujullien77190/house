import * as THREE from 'three'
import { cameraMeshes } from './live'
import { reolink } from './reolink'

describe('reolink', () => {
  it('un fût blanc, sa face noire, une casquette et une rotule, posés à leur place', () => {
    const at = new THREE.Vector3(1, 2, 3)
    const eye = reolink(at, new THREE.Vector3(1, 2, 8), 'voliere-toit')
    expect(eye.position.toArray()).toEqual([1, 2, 3])
    expect(eye.children).toHaveLength(4)
    const [barrel, lens, visor, ball] = eye.children as THREE.Mesh[]
    expect((barrel.geometry as THREE.CylinderGeometry).parameters).toMatchObject({ radiusTop: 0.034, height: 0.17 })
    // Le fût, la casquette et la rotule partagent leur blanc ; la face est noire, au bout du fût.
    expect(visor.material).toBe(barrel.material)
    expect(ball.material).toBe(barrel.material)
    expect((lens.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x0c0d10)
    expect(lens.position.z).toBeCloseTo(barrel.position.z + 0.17 / 2 + 0.003)
    expect(visor.position.y).toBeGreaterThan(0.034)
    expect(ball.position.toArray()).toEqual([0, 0, 0])
  })

  it('regarde sa cible : la face est du côté visé', () => {
    const eye = reolink(new THREE.Vector3(0, 2, 0), new THREE.Vector3(5, 1, 0), 'salon-de-jardin')
    eye.updateMatrixWorld(true)
    const lens = eye.children[1].getWorldPosition(new THREE.Vector3())
    const direction = lens.clone().sub(eye.position).normalize()
    const wanted = new THREE.Vector3(5, -1, 0).normalize()
    expect(direction.x).toBeCloseTo(wanted.x)
    expect(direction.y).toBeCloseTo(wanted.y)
    expect(direction.z).toBeCloseTo(wanted.z)
  })

  it('porte le nom de la vraie caméra : un clic sur le modèle l’ouvre', () => {
    const root = new THREE.Group()
    const eye = reolink(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 'voliere-exterieur')
    root.add(eye)
    expect(eye.userData.camera).toBe('voliere-exterieur')
    expect(cameraMeshes(root)).toEqual([{ name: 'voliere-exterieur', object: eye }])
  })
})
