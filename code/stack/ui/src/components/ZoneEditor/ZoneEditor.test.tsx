import { fireEvent, render, screen } from '@testing-library/react'
import ZoneEditor from './ZoneEditor'
import { clamp01, edgeMiddle, insertAfter, moveTo, outlinePoints, outsidePath, pointOf, removeAt } from './helpers'
import type { ZonePoint } from './types'
import { EDGE_LABEL, MAX_POINTS, VERTEX_LABEL } from './constants'

const square: ZonePoint[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
]
const triangle: ZonePoint[] = [
  [0, 0],
  [1, 0],
  [0, 1],
]

describe('helpers', () => {
  it('clamp01 borne entre 0 et 1', () => {
    expect([clamp01(-1), clamp01(0.4), clamp01(3)]).toEqual([0, 0.4, 1])
  })

  it('edgeMiddle : le milieu du côté, le dernier côté revient au premier sommet', () => {
    expect(edgeMiddle(square, 0)).toEqual([0.5, 0])
    expect(edgeMiddle(square, 3)).toEqual([0, 0.5])
  })

  it('insertAfter ajoute un sommet juste après, jusqu à la limite', () => {
    expect(insertAfter(square, 0, [0.5, 0])).toEqual([square[0], [0.5, 0], square[1], square[2], square[3]])
    const full = Array.from({ length: MAX_POINTS }, (): ZonePoint => [0.5, 0.5])
    expect(insertAfter(full, 0, [0, 0])).toBe(full)
  })

  it('removeAt retire un sommet, mais un triangle garde ses trois', () => {
    expect(removeAt(square, 1)).toEqual([square[0], square[2], square[3]])
    expect(removeAt(triangle, 1)).toBe(triangle)
  })

  it('moveTo ne change que le sommet visé', () => {
    expect(moveTo(square, 2, [0.2, 0.3])).toEqual([square[0], square[1], [0.2, 0.3], square[3]])
  })

  it('pointOf : la part de l image sous le pointeur, bornée', () => {
    const box = { left: 100, top: 50, width: 200, height: 100 }
    expect(pointOf(200, 100, box)).toEqual([0.5, 0.5])
    expect(pointOf(0, 1000, box)).toEqual([0, 1])
  })

  it('pointOf tourné d un quart de tour : x suit le bas de l écran, y suit la gauche', () => {
    const box = { left: 0, top: 0, width: 100, height: 200 }
    // En bas de l écran = x de l image à 1 ; tout à gauche de l écran = y de l image à 1.
    expect(pointOf(0, 200, box, true)).toEqual([1, 1])
    expect(pointOf(100, 0, box, true)).toEqual([0, 0])
    expect(pointOf(25, 100, box, true)).toEqual([0.5, 0.75])
  })

  it('outsidePath creuse le polygone dans le cadre, outlinePoints liste les sommets', () => {
    expect(outsidePath(triangle)).toBe('M0 0H100V100H0Z M0.00 0.00 L100.00 0.00 L0.00 100.00Z')
    expect(outlinePoints(triangle)).toBe('0.00,0.00 100.00,0.00 0.00,100.00')
  })
})

const setup = (points: ZonePoint[] = square, quarterTurn = false) => {
  const onChange = vi.fn()
  const onCommit = vi.fn()
  const view = render(<ZoneEditor points={points} onChange={onChange} onCommit={onCommit} quarterTurn={quarterTurn} />)
  const layer = view.container.firstElementChild as HTMLElement
  layer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) })
  const capture = vi.fn()
  const release = vi.fn()
  const has = vi.fn(() => true)
  layer.setPointerCapture = capture
  layer.releasePointerCapture = release
  layer.hasPointerCapture = has
  const vertices = () => screen.getAllByLabelText(VERTEX_LABEL)
  const edges = () => screen.getAllByLabelText(EDGE_LABEL)
  return { onChange, onCommit, layer, capture, release, has, vertices, edges, ...view }
}

describe('ZoneEditor rendu', () => {
  it('un rond par sommet et un par côté, placés en pourcentage', () => {
    const { vertices, edges, container } = setup()
    expect(vertices()).toHaveLength(4)
    expect(edges()).toHaveLength(4)
    expect(vertices()[2].style.left).toBe('100%')
    expect(vertices()[2].style.top).toBe('100%')
    expect(edges()[0].style.left).toBe('50%')
    expect(edges()[0].style.top).toBe('0%')
    expect(container.querySelector('polygon')).toHaveAttribute('points', outlinePoints(square))
    expect(container.querySelector('path')).toHaveAttribute('d', outsidePath(square))
  })
})

describe('ZoneEditor glisser un sommet', () => {
  it('le sommet tenu suit le pointeur, relâcher enregistre', () => {
    const { vertices, layer, onChange, onCommit, capture, release } = setup()
    fireEvent.pointerDown(vertices()[1], { pointerId: 7 })
    expect(capture).toHaveBeenCalledWith(7)
    fireEvent.pointerMove(layer, { clientX: 80, clientY: 30 })
    expect(onChange).toHaveBeenCalledWith(moveTo(square, 1, [0.8, 0.3]))
    fireEvent.pointerUp(layer, { pointerId: 7 })
    expect(release).toHaveBeenCalledWith(7)
    expect(onCommit).toHaveBeenCalledWith(square)
  })

  it('le pointeur reste dans l image', () => {
    const { vertices, layer, onChange } = setup()
    fireEvent.pointerDown(vertices()[0])
    fireEvent.pointerMove(layer, { clientX: -50, clientY: 500 })
    expect(onChange).toHaveBeenCalledWith(moveTo(square, 0, [0, 1]))
  })

  it('tourné d un quart de tour, les axes sont échangés', () => {
    const { vertices, layer, onChange } = setup(square, true)
    fireEvent.pointerDown(vertices()[0])
    fireEvent.pointerMove(layer, { clientX: 20, clientY: 60 })
    expect(onChange).toHaveBeenCalledWith(moveTo(square, 0, [0.6, 0.8]))
  })

  it('le mouvement sans sommet tenu ne fait rien', () => {
    const { layer, onChange } = setup()
    fireEvent.pointerMove(layer, { clientX: 10, clientY: 10 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('un cadre sans taille (pas encore dessiné) ne fait rien', () => {
    const { vertices, layer, onChange } = setup()
    layer.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0)
    fireEvent.pointerDown(vertices()[0])
    fireEvent.pointerMove(layer, { clientX: 10, clientY: 10 })
    expect(onChange).not.toHaveBeenCalled()
    layer.getBoundingClientRect = () => new DOMRect(0, 0, 100, 0)
    fireEvent.pointerMove(layer, { clientX: 10, clientY: 10 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('relâcher sans rien tenir n enregistre rien ; relâcher deux fois non plus', () => {
    const { vertices, layer, onCommit } = setup()
    fireEvent.pointerUp(layer)
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.pointerDown(vertices()[0])
    fireEvent.pointerUp(layer)
    fireEvent.pointerUp(layer)
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('l annulation du pointeur relâche comme un relâchement', () => {
    const { vertices, layer, onCommit } = setup()
    fireEvent.pointerDown(vertices()[0])
    fireEvent.pointerCancel(layer)
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('ne relâche la capture que si elle est encore tenue', () => {
    const { vertices, layer, has, release, onCommit } = setup()
    has.mockReturnValue(false)
    fireEvent.pointerDown(vertices()[0])
    fireEvent.pointerUp(layer)
    expect(release).not.toHaveBeenCalled()
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('l appui sur un sommet n atteint pas les parents', () => {
    const parent = vi.fn()
    const onChange = vi.fn()
    const { container } = render(
      <div onPointerDown={parent}>
        <ZoneEditor points={square} onChange={onChange} onCommit={() => undefined} />
      </div>,
    )
    ;(container.firstElementChild?.firstElementChild as HTMLElement).setPointerCapture = vi.fn()
    fireEvent.pointerDown(screen.getAllByLabelText(VERTEX_LABEL)[0])
    expect(parent).not.toHaveBeenCalled()
  })
})

describe('ZoneEditor ajouter un sommet', () => {
  it('tenir le milieu d un côté crée un sommet qu on continue de glisser', () => {
    const { edges, layer, onChange, onCommit } = setup()
    fireEvent.pointerDown(edges()[0])
    expect(onChange).toHaveBeenCalledWith(insertAfter(square, 0, [0.5, 0]))
    fireEvent.pointerMove(layer, { clientX: 50, clientY: 20 })
    // Le parent n a pas encore remonté les nouveaux sommets : le déplacement porte sur le sommet suivant (rang 1).
    expect(onChange).toHaveBeenLastCalledWith(moveTo(square, 1, [0.5, 0.2]))
    fireEvent.pointerUp(layer)
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('au maximum de sommets, rien n est ajouté', () => {
    const many = Array.from({ length: MAX_POINTS }, (_, i): ZonePoint => [(i % 10) / 10, Math.floor(i / 10) / 10])
    const { edges, onChange, capture } = setup(many)
    fireEvent.pointerDown(edges()[0])
    expect(onChange).not.toHaveBeenCalled()
    expect(capture).not.toHaveBeenCalled()
  })
})

describe('ZoneEditor retirer un sommet', () => {
  it('double clic retire le sommet et enregistre aussitôt', () => {
    const { vertices, onChange, onCommit } = setup()
    fireEvent.doubleClick(vertices()[1])
    expect(onChange).toHaveBeenCalledWith(removeAt(square, 1))
    expect(onCommit).toHaveBeenCalledWith(removeAt(square, 1))
  })

  it('clic droit aussi, sans le menu du navigateur', () => {
    const { vertices, onChange, onCommit } = setup()
    // false : le menu contextuel a été empêché.
    expect(fireEvent.contextMenu(vertices()[2])).toBe(false)
    expect(onChange).toHaveBeenCalledWith(removeAt(square, 2))
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('un triangle garde ses trois sommets', () => {
    const { vertices, onChange, onCommit } = setup(triangle)
    fireEvent.doubleClick(vertices()[0])
    fireEvent.contextMenu(vertices()[0])
    expect(onChange).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
  })
})
