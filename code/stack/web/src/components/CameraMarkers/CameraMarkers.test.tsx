import { fireEvent, render, screen } from '@testing-library/react'
import CameraMarkers from './CameraMarkers'
import { MARKER_FIXED_CLASS, MARKER_MOVABLE_CLASS, OPEN_PREFIX } from './constants'

// `MARKERS_EDITABLE` est une constante : le double la lit dans un état que chaque test fixe.
const state = vi.hoisted(() => ({ editable: true }))
vi.mock('./constants', async (importOriginal) => {
  const original = await importOriginal<typeof import('./constants')>()
  return {
    ...original,
    get MARKERS_EDITABLE() {
      return state.editable
    },
  }
})

/** jsdom n'a pas de PointerEvent : un événement souris qui porte en plus l'identifiant du pointeur. */
class FakePointerEvent extends MouseEvent {
  pointerId: number
  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 1
  }
}

const MARKERS = [
  { target: 'b', x: 0.25, y: 0.14 },
  { target: 'c', x: 0.5, y: 0.5 },
]

const setup = (box: { width: number; height: number } = { width: 200, height: 100 }) => {
  const handlers = { onMove: vi.fn(), onCommit: vi.fn(), onRemove: vi.fn(), onOpen: vi.fn() }
  const { container } = render(<CameraMarkers markers={MARKERS} {...handlers} />)
  const layer = container.firstElementChild as HTMLElement
  layer.getBoundingClientRect = () => ({
    left: 10,
    top: 20,
    width: box.width,
    height: box.height,
    right: 0,
    bottom: 0,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  })
  return { ...handlers, layer, marker: (name: string) => screen.getByRole('button', { name: `${OPEN_PREFIX}${name}` }) }
}

beforeEach(() => {
  state.editable = true
  vi.stubGlobal('PointerEvent', FakePointerEvent)
})
afterEach(() => vi.unstubAllGlobals())

describe('CameraMarkers, places modifiables', () => {
  it('un repère par caméra, placé en parts de l’image, avec le curseur de la main qui attrape', () => {
    const { marker } = setup()
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(document.querySelectorAll('svg')).toHaveLength(2)
    expect(marker('b').style.left).toBe('25%')
    expect(marker('b').style.top).toBe('14%')
    expect(marker('b')).toHaveAttribute('title', 'b')
    expect(marker('b')).toHaveClass(MARKER_MOVABLE_CLASS)
  })
  it('un clic sans glisser ouvre la caméra', () => {
    const { marker, onOpen, onCommit } = setup()
    fireEvent.pointerDown(marker('b'), { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(marker('b'), { clientX: 52, clientY: 52 })
    fireEvent.pointerUp(marker('b'))
    expect(onOpen).toHaveBeenCalledWith('b')
    expect(onCommit).not.toHaveBeenCalled()
  })
  it('glisser déplace le repère puis enregistre au relâchement, sans ouvrir', () => {
    const { marker, onMove, onCommit, onOpen } = setup()
    fireEvent.pointerDown(marker('b'), { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(marker('b'), { clientX: 110, clientY: 70 })
    expect(onMove).toHaveBeenCalledWith('b', 0.5, 0.5)
    fireEvent.pointerMove(marker('b'), { clientX: 60, clientY: 45 })
    expect(onMove).toHaveBeenLastCalledWith('b', 0.25, 0.25)
    fireEvent.pointerUp(marker('b'))
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })
  it('un mouvement sans appui, ou d’un autre repère, ne fait rien', () => {
    const { marker, onMove } = setup()
    fireEvent.pointerMove(marker('b'), { clientX: 110, clientY: 70 })
    fireEvent.pointerDown(marker('b'), { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(marker('c'), { clientX: 110, clientY: 70 })
    expect(onMove).not.toHaveBeenCalled()
  })
  it('un relâchement sans appui, ou sur un autre repère, ne fait rien', () => {
    const { marker, onOpen, onCommit } = setup()
    fireEvent.pointerUp(marker('b'))
    fireEvent.pointerDown(marker('b'), { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerUp(marker('c'))
    expect(onOpen).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
  })
  it('seul le bouton principal démarre un glisser', () => {
    const { marker, onOpen, onMove } = setup()
    fireEvent.pointerDown(marker('b'), { button: 2, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(marker('b'), { clientX: 110, clientY: 70 })
    fireEvent.pointerUp(marker('b'))
    expect(onMove).not.toHaveBeenCalled()
    expect(onOpen).not.toHaveBeenCalled()
  })
  it('un glisser sur une couche sans taille ne déplace rien', () => {
    const { marker, onMove, onCommit } = setup({ width: 0, height: 0 })
    fireEvent.pointerDown(marker('b'), { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(marker('b'), { clientX: 110, clientY: 70 })
    expect(onMove).not.toHaveBeenCalled()
    fireEvent.pointerUp(marker('b'))
    expect(onCommit).toHaveBeenCalledTimes(1)
  })
  it('un glisser sans couche mesurable (hauteur nulle seule) ne déplace rien', () => {
    const { marker, onMove } = setup({ width: 200, height: 0 })
    fireEvent.pointerDown(marker('b'), { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(marker('b'), { clientX: 110, clientY: 70 })
    expect(onMove).not.toHaveBeenCalled()
  })
  it('capture le pointeur, et relâche, même si le navigateur refuse', () => {
    const { marker, onOpen } = setup()
    const button = marker('b')
    button.setPointerCapture = vi.fn()
    button.releasePointerCapture = vi.fn()
    fireEvent.pointerDown(button, { button: 0 })
    fireEvent.pointerUp(button)
    expect(button.setPointerCapture).toHaveBeenCalledWith(1)
    expect(button.releasePointerCapture).toHaveBeenCalledWith(1)
    button.setPointerCapture = vi.fn(() => {
      throw new Error('pas de capture')
    })
    button.releasePointerCapture = vi.fn(() => {
      throw new Error('rien à relâcher')
    })
    fireEvent.pointerDown(button, { button: 0 })
    fireEvent.pointerUp(button)
    expect(onOpen).toHaveBeenCalledTimes(2)
  })
  it('un appui annulé n’ouvre rien', () => {
    const { marker, onOpen } = setup()
    fireEvent.pointerDown(marker('b'), { button: 0 })
    fireEvent.pointerCancel(marker('b'))
    fireEvent.pointerUp(marker('b'))
    expect(onOpen).not.toHaveBeenCalled()
  })
  it('le clic droit retire le repère', () => {
    const { marker, onRemove } = setup()
    expect(fireEvent.contextMenu(marker('c'))).toBe(false)
    expect(onRemove).toHaveBeenCalledWith('c')
  })
})

describe('CameraMarkers, places figées', () => {
  beforeEach(() => {
    state.editable = false
  })
  it('le curseur est celui d’un clic', () => {
    const { marker } = setup()
    expect(marker('b')).toHaveClass(MARKER_FIXED_CLASS)
  })
  it('un appui suivi d’un grand mouvement ouvre quand même la caméra, sans déplacer', () => {
    const { marker, onMove, onOpen, onCommit } = setup()
    fireEvent.pointerDown(marker('b'), { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(marker('b'), { clientX: 110, clientY: 70 })
    fireEvent.pointerUp(marker('b'))
    expect(onMove).not.toHaveBeenCalled()
    expect(onCommit).not.toHaveBeenCalled()
    expect(onOpen).toHaveBeenCalledWith('b')
  })
  it('le clic droit ne retire rien', () => {
    const { marker, onRemove } = setup()
    expect(fireEvent.contextMenu(marker('c'))).toBe(true)
    expect(onRemove).not.toHaveBeenCalled()
  })
})

describe('CameraMarkers : les caméras inactives ne font rien', () => {
  const markers = [
    { target: 'a', x: 0.2, y: 0.3 },
    { target: 'b', x: 0.6, y: 0.5 },
  ]

  it('le repère d’une caméra éteinte est grisé, désactivé, et un appui ne l’ouvre pas ; les autres agissent', () => {
    const onOpen = vi.fn()
    render(<CameraMarkers markers={markers} onMove={vi.fn()} onCommit={vi.fn()} onRemove={vi.fn()} onOpen={onOpen} inactive={['b']} />)
    const off = screen.getByRole('button', { name: 'Ouvrir la caméra b' })
    expect(off).toBeDisabled()
    expect(off.className).toContain('opacity-40')
    fireEvent.pointerDown(off, { button: 0 })
    fireEvent.pointerUp(off)
    expect(onOpen).not.toHaveBeenCalled()
    const on = screen.getByRole('button', { name: 'Ouvrir la caméra a' })
    expect(on).not.toBeDisabled()
    fireEvent.pointerDown(on, { button: 0 })
    fireEvent.pointerUp(on)
    expect(onOpen).toHaveBeenCalledWith('a')
  })

  it('sans caméra inactive, tous les repères agissent', () => {
    render(<CameraMarkers markers={markers} onMove={vi.fn()} onCommit={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} />)
    for (const button of screen.getAllByRole('button')) expect(button).not.toBeDisabled()
  })
})
