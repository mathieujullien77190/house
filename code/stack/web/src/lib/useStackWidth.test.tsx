import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { useStackWidth } from './useStackWidth'

let observers: { cb: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = []
beforeEach(() => {
  observers = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(cb: () => void) {
        observers.push({ cb, observe: this.observe, disconnect: this.disconnect })
      }
    },
  )
})

const rect = (width: number, height: number) => ({ width, height }) as DOMRect

const Harness = ({ withTarget = true, withColumn = true, withGrid = true }: { withTarget?: boolean; withColumn?: boolean; withGrid?: boolean }) => {
  const grid = useRef<HTMLDivElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLDivElement>(null)
  useStackWidth(withGrid ? grid : { current: null }, stack, target)
  return (
    <div ref={grid} data-testid="grid">
      {withColumn ? (
        <div ref={stack} data-testid="stack">
          <div data-testid="tile1" />
          <div data-testid="tile2" />
        </div>
      ) : null}
      {withTarget ? <div ref={target} data-testid="target" /> : null}
    </div>
  )
}

/** Les rectangles mesurés : le voisin (hauteur voulue), la colonne et chaque vignette. */
const measure = (target: DOMRect, column: DOMRect, tile: DOMRect) =>
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const id = this.dataset.testid
    return id === 'target' ? target : id === 'stack' ? column : tile
  })
const col1 = (element: HTMLElement) => element.style.getPropertyValue('--col1')

describe('useStackWidth', () => {
  afterEach(() => vi.restoreAllMocks())

  it('règle --col1 pour que les vignettes empilées aient la hauteur de la vignette voisine', () => {
    // vignette de 362 px de large : vidéo 360 * 9/16 = 202,5 ; hauteur 260 => 57,5 autour de chacune ; pas d'espace (jsdom)
    measure(rect(400, 700), rect(362, 600), rect(362, 260))
    const { getByTestId } = render(<Harness />)
    // vidéo = (700 - 115) / 2 = 292,5 => largeur = 292,5 * 16/9 + 2 = 522
    expect(col1(getByTestId('grid'))).toBe('522px')
    expect(observers[0].observe).toHaveBeenCalledTimes(2)
  })

  it('compte l’espace entre les vignettes quand il est lisible', () => {
    measure(rect(400, 700), rect(362, 600), rect(362, 260))
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ rowGap: '10px' } as CSSStyleDeclaration)
    const { getByTestId } = render(<Harness />)
    // vidéo = (700 - 10 - 115) / 2 = 287,5 => 287,5 * 16/9 + 2 = 513,2
    expect(col1(getByTestId('grid'))).toBe('513px')
  })

  it('borne la largeur entre 200 et 800 px', () => {
    measure(rect(400, 5000), rect(362, 600), rect(362, 260))
    const high = render(<Harness />)
    expect(col1(high.getByTestId('grid'))).toBe('800px')
    high.unmount()
    vi.restoreAllMocks()
    measure(rect(400, 100), rect(362, 600), rect(362, 260))
    const low = render(<Harness />)
    expect(col1(low.getByTestId('grid'))).toBe('200px')
  })

  it('colonne cachée ou voisine sans hauteur : la largeur de la grille s’applique', () => {
    measure(rect(400, 700), rect(362, 600), rect(362, 260))
    const { getByTestId } = render(<Harness />)
    expect(col1(getByTestId('grid'))).not.toBe('')
    vi.restoreAllMocks()
    measure(rect(400, 0), rect(362, 600), rect(362, 260))
    act(() => observers[0].cb())
    expect(col1(getByTestId('grid'))).toBe('')
    vi.restoreAllMocks()
    measure(rect(400, 700), rect(362, 600), rect(362, 260))
    act(() => observers[0].cb())
    expect(col1(getByTestId('grid'))).not.toBe('')
    vi.restoreAllMocks()
    measure(rect(400, 700), rect(0, 600), rect(362, 260))
    act(() => observers[0].cb())
    expect(col1(getByTestId('grid'))).toBe('')
  })

  it('une colonne sans vignette efface la largeur', () => {
    measure(rect(400, 700), rect(362, 600), rect(362, 260))
    const { getByTestId } = render(<Harness />)
    getByTestId('stack').replaceChildren()
    act(() => observers[0].cb())
    expect(col1(getByTestId('grid'))).toBe('')
  })

  it('sans colonne, sans voisine ou sans grille : rien n’est observé', () => {
    render(<Harness withTarget={false} />)
    render(<Harness withColumn={false} />)
    render(<Harness withGrid={false} />)
    expect(observers).toHaveLength(0)
  })

  it('arrête d’observer au démontage', () => {
    measure(rect(400, 700), rect(362, 600), rect(362, 260))
    const { unmount } = render(<Harness />)
    unmount()
    expect(observers[0].disconnect).toHaveBeenCalled()
  })
})
