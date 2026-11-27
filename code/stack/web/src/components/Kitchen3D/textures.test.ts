import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { COLORS } from './constants'
import {
  butcherTexture,
  clockDialTexture,
  lambrisTexture,
  photoTexture,
  showerTilesTexture,
  sisalTexture,
  terracottaTexture,
  tileTexture,
  wireTexture,
} from './textures'

type Rect = [number, number, number, number]

/** Dessine une texture sur un faux contexte et rend ce contexte. */
const drawn = (texture: () => THREE.CanvasTexture) => {
  const context = fakeContext2d()
  stubCanvasContext(context)
  const made = texture()
  return { context, size: (made.image as HTMLCanvasElement).width, rects: context.fillRect.mock.calls as Rect[] }
}

describe('les textures dessinées', () => {
  it('le plan de travail : des lames de 18 px coupées en tronçons, sur toute l’image', () => {
    const { rects } = drawn(butcherTexture)
    expect(new Set(rects.map(([, y]) => y)).size).toBe(29)
    for (const [, , length, height] of rects) {
      expect(length).toBeGreaterThanOrEqual(128)
      expect(length).toBeLessThan(358)
      expect(height).toBe(18)
    }
    // Chaque rangée va jusqu'au bord droit.
    const last = rects.filter(([, y]) => y === 0).at(-1) as Rect
    expect(last[0] + last[2]).toBeGreaterThanOrEqual(512)
  })

  it('le carrelage métro : le joint, puis huit rangées de carreaux décalées une sur deux', () => {
    const { context, size, rects } = drawn(tileTexture)
    expect(size).toBe(256)
    expect(rects[0]).toEqual([0, 0, 256, 256])
    expect(rects).toHaveLength(49)
    expect(rects[1]).toEqual([-62, 2, 60, 28])
    expect(rects[7]).toEqual([-30, 34, 60, 28])
    expect(context.fillStyle).toBe(COLORS.tile)
    expect(context.globalAlpha).toBe(1)
  })

  it('le lambris : dix lames rainurées', () => {
    const { rects } = drawn(lambrisTexture)
    expect(rects).toHaveLength(21)
    expect(rects[0]).toEqual([0, 0, 512, 512])
  })

  it('le sisal : des rangs de petites mailles en quinconce sur un fond beige', () => {
    const { rects } = drawn(sisalTexture)
    expect(rects[0]).toEqual([0, 0, 512, 512])
    // Soixante-quatre rangs de trente-trois mailles ; un rang sur deux est décalé d'une demi-maille.
    expect(rects).toHaveLength(1 + 64 * 33)
    expect(rects[1]).toEqual([0, 1, 14, 6])
    expect(rects[34]).toEqual([-8, 9, 14, 6])
  })

  it('la terre cuite : seize cases de deux carreaux, couchés ou debout en damier, deux fois plus longs que larges', () => {
    const { rects } = drawn(terracottaTexture)
    expect(rects[0]).toEqual([0, 0, 512, 512])
    const tiles = rects.slice(1)
    expect(tiles).toHaveLength(32)
    // La première case : deux carreaux couchés l'un sur l'autre ; la suivante : deux debout côte à côte.
    expect(tiles.slice(0, 2)).toEqual([
      [2, 2, 124, 60],
      [2, 66, 124, 60],
    ])
    expect(tiles.slice(2, 4)).toEqual([
      [130, 2, 60, 124],
      [194, 2, 60, 124],
    ])
    expect(tiles.filter(([, , width, height]) => width > height)).toHaveLength(16)
  })

  it('la douche : seize carreaux carrés de côté, de quatre teintes, plus sombres vers le bas', () => {
    const context = fakeContext2d()
    // Retient la teinte de chaque carreau au moment où il est peint.
    const tints: string[] = []
    context.fillRect.mockImplementation(() => {
      tints.push(context.fillStyle)
    })
    stubCanvasContext(context)
    showerTilesTexture()
    const rects = context.fillRect.mock.calls as Rect[]
    expect(rects).toHaveLength(1 + 16 * 16)
    expect(rects[1]).toEqual([1, 1, 30, 30])
    expect(rects.at(-1)).toEqual([481, 481, 30, 30])
    const tiles = tints.slice(1)
    expect(new Set(tiles)).toEqual(new Set(['#1f4a47', '#9db7a6', '#b9cdbd', '#eeece2']))
    const dark = (rows: string[]) => rows.filter((tint) => tint === '#1f4a47').length
    expect(dark(tiles.slice(-64))).toBeGreaterThan(dark(tiles.slice(0, 64)))
  })

  it('le grillage : cinq fils dans chaque sens sur un fond transparent, des mailles de 64 px', () => {
    const { context, size, rects } = drawn(wireTexture)
    expect(size).toBe(256)
    expect(rects).toHaveLength(0)
    expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 256, 256)
    expect(context.stroke).toHaveBeenCalledTimes(5)
    expect(context.lineTo.mock.calls).toHaveLength(10)
    expect(context.lineTo.mock.calls.slice(2, 4)).toEqual([
      [64, 256],
      [256, 64],
    ])
    expect(context.lineWidth).toBe(5)
  })

  it('le cadran de la pendule : les douze nombres, chacun tourné selon son heure, et « QUARTZ »', () => {
    const { context } = drawn(clockDialTexture)
    const texts = (context.fillText.mock.calls as [string, number, number][]).map(([text]) => text)
    expect(texts).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'Q U A R T Z'])
    expect(context.rotate).toHaveBeenCalledTimes(12)
    expect(context.rotate).toHaveBeenNthCalledWith(3, Math.PI / 2)
    expect(context.save).toHaveBeenCalledTimes(12)
    expect(context.restore).toHaveBeenCalledTimes(12)
  })

  it('le même dessin à chaque fois : les tirages partent d’une graine fixe', () => {
    for (const texture of [butcherTexture, sisalTexture, terracottaTexture, showerTilesTexture]) expect(drawn(texture).rects).toEqual(drawn(texture).rects)
  })
})

describe('photoTexture', () => {
  it('charge une photo de `public/kitchen3d/`, en sRGB', () => {
    const loaded = new THREE.Texture<HTMLImageElement>()
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => loaded)
    const texture = photoTexture('city.jpg')
    expect(load).toHaveBeenCalledExactlyOnceWith(`${import.meta.env.BASE_URL}kitchen3d/city.jpg`)
    expect(texture).toBe(loaded)
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  })
})
