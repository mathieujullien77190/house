import { render } from '@testing-library/react'
import type { HeatmapStatus } from '@/types'
import HeatmapOverlay from './HeatmapOverlay'
import { colorOf, decodeLevel, paint } from './helpers'

const encode = (values: number[]): string => btoa(String.fromCharCode(...new Uint8Array(new Uint16Array(values).buffer)))

describe('decodeLevel', () => {
  it('lit des Uint16 petit-boutistes, les valeurs manquantes valent 0', () => {
    expect([...decodeLevel(encode([1, 2, 300]), 3)]).toEqual([1, 2, 300])
    expect([...decodeLevel(encode([7]), 3)]).toEqual([7, 0, 0])
  })
})

describe('colorOf', () => {
  it('les arrêts, le milieu entre deux arrêts, les bornes', () => {
    expect(colorOf(0)).toEqual([0, 60, 255, 0])
    expect(colorOf(0.5)).toEqual([0, 220, 120, 140])
    expect(colorOf(1)).toEqual([255, 40, 0, 205])
    expect(colorOf(0.125)).toEqual([0, 75, 255, 45])
    expect(colorOf(-3)).toEqual([0, 60, 255, 0])
    expect(colorOf(9)).toEqual([255, 40, 0, 205])
    expect(colorOf(Number.NaN)).toEqual([255, 40, 0, 205])
  })
})

describe('paint', () => {
  it('une carte vide reste transparente', () => {
    expect([...paint(new Uint16Array(2))]).toEqual([0, 60, 255, 0, 0, 60, 255, 0])
  })
  it('les cases les plus agitées sont rouges, les cases sans changement transparentes', () => {
    const pixels = paint(new Uint16Array([0, 5, 5, 5]))
    expect([...pixels.slice(0, 4)]).toEqual([0, 60, 255, 0])
    expect([...pixels.slice(4, 8)]).toEqual([255, 40, 0, 205])
  })
})

describe('HeatmapOverlay', () => {
  const data = (levels: string[]): HeatmapStatus => ({ cols: 2, rows: 1, thresholds: [1, 2], pairs: 3, computing: false, done: 0, total: 0, levels })
  const putImageData = vi.fn()

  beforeEach(() => {
    putImageData.mockClear()
    vi.stubGlobal(
      'ImageData',
      class {
        constructor(
          public data: Uint8ClampedArray,
          public width: number,
          public height: number,
        ) {}
      },
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ putImageData } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('dessine le seuil choisi sur un canvas d’une case par pixel', () => {
    const { container } = render(<HeatmapOverlay data={data([encode([0, 4]), encode([9, 9])])} level={0} />)
    const canvas = container.querySelector('canvas')!
    expect([canvas.width, canvas.height]).toEqual([2, 1])
    expect(putImageData).toHaveBeenCalledTimes(1)
    const image = putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray; width: number }
    expect(image.width).toBe(2)
    expect([...image.data.slice(4, 8)]).toEqual([255, 40, 0, 205])
  })

  it('le rang est borné aux seuils connus ; un changement de seuil redessine', () => {
    const levels = [encode([0, 4]), encode([4, 0])]
    const { rerender } = render(<HeatmapOverlay data={data(levels)} level={-2} />)
    rerender(<HeatmapOverlay data={data(levels)} level={9} />)
    expect(putImageData).toHaveBeenCalledTimes(2)
    // même contenu : pas de nouveau dessin
    rerender(<HeatmapOverlay data={data(levels)} level={9} />)
    expect(putImageData).toHaveBeenCalledTimes(2)
  })

  it('sans seuil ou sans contexte 2D : rien n’est dessiné', () => {
    render(<HeatmapOverlay data={data([])} level={0} />)
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null)
    render(<HeatmapOverlay data={data([encode([1, 1])])} level={0} />)
    expect(putImageData).not.toHaveBeenCalled()
  })
})
