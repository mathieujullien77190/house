import * as THREE from 'three'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import { COLORS } from './constants'
import {
  butcherTexture,
  clockDialTexture,
  formedConcreteTexture,
  lambrisTexture,
  onPhotoLoad,
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

  it('le béton banché : un gris moucheté, les joints des banches tous les 25 cm et huit trous de serre-joint, sur une image d’un mètre', () => {
    const { context, size, rects } = drawn(formedConcreteTexture)
    expect(size).toBe(512)
    // Le fond, puis 2 200 mouchetures.
    expect(rects[0]).toEqual([0, 0, 512, 512])
    expect(rects).toHaveLength(2201)
    for (const [x, y, wide, tall] of rects.slice(1)) {
      expect(x).toBeLessThan(512)
      expect(y).toBeLessThan(512)
      expect(wide).toBeLessThan(5)
      expect(tall).toBeLessThan(4)
    }
    // Quatre joints horizontaux, un tous les 128 px (25 cm), d'un bord à l'autre.
    expect(context.stroke).toHaveBeenCalledTimes(4)
    expect(context.moveTo.mock.calls).toEqual([0, 1, 2, 3].map((line) => [0, line * 128 + 1]))
    expect(context.lineTo.mock.calls).toEqual([0, 1, 2, 3].map((line) => [512, line * 128 + 1]))
    expect(context.lineWidth).toBe(2)
    // Huit trous ronds, en quinconce.
    expect(context.arc.mock.calls).toHaveLength(8)
    expect(context.arc.mock.calls[0]).toEqual([64, 64, 4, 0, Math.PI * 2])
    expect(context.fill).toHaveBeenCalledTimes(8)
  })

  it('le même dessin à chaque fois : les tirages partent d’une graine fixe', () => {
    for (const texture of [butcherTexture, sisalTexture, terracottaTexture, showerTilesTexture, formedConcreteTexture]) expect(drawn(texture).rects).toEqual(drawn(texture).rects)
  })
})

describe('photoTexture', () => {
  it('charge une photo de `public/kitchen3d/`, en sRGB', () => {
    const loaded = new THREE.Texture<HTMLImageElement>()
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => loaded)
    const texture = photoTexture('city.jpg')
    expect(load).toHaveBeenCalledExactlyOnceWith(`${import.meta.env.BASE_URL}kitchen3d/city.jpg`, expect.any(Function))
    expect(texture).toBe(loaded)
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('prévient quand une photo a fini de se charger (la scène, dessinée à la demande, a une image de plus à faire) ; on peut se désabonner', () => {
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => new THREE.Texture<HTMLImageElement>())
    const first = vi.fn()
    const second = vi.fn()
    const stopFirst = onPhotoLoad(first)
    const stopSecond = onPhotoLoad(second)
    photoTexture('city.jpg')
    expect(first).not.toHaveBeenCalled()
    const done = load.mock.calls[0][1] as (texture: THREE.Texture) => void
    done(new THREE.Texture())
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    stopFirst()
    done(new THREE.Texture())
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
    stopSecond()
  })
})
