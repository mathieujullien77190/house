import * as THREE from 'three'
import { disposeObject } from './three'

describe('disposeObject', () => {
  it('libère géométries, matériaux et textures de tout l’arbre', () => {
    const root = new THREE.Group()
    const texture = new THREE.Texture()
    const textured = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: texture }))
    const plain = new THREE.MeshStandardMaterial()
    const other = new THREE.MeshStandardMaterial()
    const several = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [plain, other])
    const inner = new THREE.Group()
    inner.add(several)
    root.add(textured, inner)
    const spies = [textured.geometry, textured.material, texture, several.geometry, plain, other].map((item) => vi.spyOn(item, 'dispose'))
    disposeObject(root)
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
  })

  it('un objet sans géométrie ni matériau est passé', () => {
    const light = new THREE.Group()
    light.add(new THREE.Object3D())
    expect(() => disposeObject(light)).not.toThrow()
  })
})

describe('supportsWebGL', () => {
  /** Un module neuf (la réponse est gardée), avec un canevas qui rend ce contexte. */
  const load = async (getContext: () => unknown) => {
    vi.resetModules()
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext as never)
    const { supportsWebGL } = await import('./three')
    return { supportsWebGL, spy }
  }

  it('vrai avec un contexte WebGL, qui est rendu aussitôt ; le test ne se fait qu’une fois', async () => {
    const loseContext = vi.fn()
    const getExtension = vi.fn(() => ({ loseContext }))
    const { supportsWebGL, spy } = await load(() => ({ getExtension }))
    expect(supportsWebGL()).toBe(true)
    expect(supportsWebGL()).toBe(true)
    expect(spy).toHaveBeenCalledExactlyOnceWith('webgl2')
    expect(getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
    expect(loseContext).toHaveBeenCalledTimes(1)
  })

  it('vrai même si le contexte ne sait pas se rendre', async () => {
    const { supportsWebGL } = await load(() => ({ getExtension: () => null }))
    expect(supportsWebGL()).toBe(true)
  })

  it('faux sans contexte', async () => {
    const { supportsWebGL } = await load(() => null)
    expect(supportsWebGL()).toBe(false)
  })

  it('faux si le navigateur refuse', async () => {
    const { supportsWebGL, spy } = await load(() => {
      throw new Error('bloqué')
    })
    expect(supportsWebGL()).toBe(false)
    expect(supportsWebGL()).toBe(false)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
