import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { BULB_OFF, box, canvasTexture, cylinder, fixtureBulb, seeded, standard } from './primitives'

describe('seeded', () => {
  it('rend la même suite pour la même graine, entre 0 et 1', () => {
    const first = seeded(11)
    const second = seeded(11)
    const other = seeded(12)
    const values = Array.from({ length: 50 }, () => first())
    expect(values).toEqual(Array.from({ length: 50 }, () => second()))
    expect(values).not.toEqual(Array.from({ length: 50 }, () => other()))
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
    expect(new Set(values).size).toBeGreaterThan(40)
  })
})

describe('canvasTexture', () => {
  it('dessine sur un canevas carré qui se répète', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    const draw = vi.fn()
    const texture = canvasTexture(256, draw)
    expect(draw).toHaveBeenCalledExactlyOnceWith(context)
    const canvas = texture.image as HTMLCanvasElement
    expect(canvas.width).toBe(256)
    expect(canvas.height).toBe(256)
    expect(texture.wrapS).toBe(THREE.RepeatWrapping)
    expect(texture.wrapT).toBe(THREE.RepeatWrapping)
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.anisotropy).toBe(4)
  })

  it('sans contexte 2D, la texture reste vide', () => {
    stubCanvasContext(null)
    const draw = vi.fn()
    expect(canvasTexture(64, draw)).toBeInstanceOf(THREE.CanvasTexture)
    expect(draw).not.toHaveBeenCalled()
  })
})

describe('standard', () => {
  it('une couleur : mat, d’un seul côté par défaut', () => {
    const material = standard(0x112233, 0.4)
    expect(material.color.getHex()).toBe(0x112233)
    expect(material.map).toBeNull()
    expect(material.roughness).toBe(0.4)
    expect(material.metalness).toBe(0)
    expect(material.side).toBe(THREE.FrontSide)
  })

  it('une texture, du métal, les deux côtés', () => {
    const texture = new THREE.Texture()
    const material = standard(texture, 0.3, 0.9, THREE.DoubleSide)
    expect(material.map).toBe(texture)
    expect(material.metalness).toBe(0.9)
    expect(material.side).toBe(THREE.DoubleSide)
  })
})

describe('box, cylinder', () => {
  it('un pavé centré à sa place', () => {
    const material = standard(0xffffff, 1)
    const mesh = box(1, 2, 3, material, 4, 5, 6)
    expect(mesh.material).toBe(material)
    expect(mesh.position.toArray()).toEqual([4, 5, 6])
    expect((mesh.geometry as THREE.BoxGeometry).parameters).toMatchObject({ width: 1, height: 2, depth: 3 })
  })

  it('un cylindre à 24 pans par défaut', () => {
    const material = standard(0xffffff, 1)
    const round = cylinder(0.1, 0.2, 0.5, material, 1, 2, 3)
    expect(round.position.toArray()).toEqual([1, 2, 3])
    expect((round.geometry as THREE.CylinderGeometry).parameters).toMatchObject({ radiusTop: 0.1, radiusBottom: 0.2, height: 0.5, radialSegments: 24 })
    expect((cylinder(0.1, 0.1, 1, material, 0, 0, 0, 12).geometry as THREE.CylinderGeometry).parameters.radialSegments).toBe(12)
  })
})

describe('fixtureBulb', () => {
  it('marque l’ampoule et lui donne son propre matériau, éteint', () => {
    const shared = new THREE.MeshBasicMaterial({ color: 0xffe2b0 })
    const mesh = cylinder(0.05, 0.05, 0.1, shared, 0, 0, 0)
    expect(fixtureBulb(mesh)).toBe(mesh)
    expect(mesh.userData.fixture).toBe(true)
    expect(mesh.material).not.toBe(shared)
    expect((mesh.material as THREE.MeshBasicMaterial).color.getHex()).toBe(BULB_OFF)
  })
})
