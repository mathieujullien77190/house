import { act, fireEvent, render } from '@testing-library/react'
import { usePinchZoom } from './usePinchZoom'

interface Options {
  active: boolean
  rotated?: boolean
  resetKey?: string
  wheel?: boolean
}

const Zone = ({ active, rotated, resetKey, wheel }: Options) => {
  const { handlers, style } = usePinchZoom(active, rotated, resetKey, wheel)
  return <div data-testid="zone" {...handlers} style={style} />
}

let captured: Set<number>
let portrait = false

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(10_000)
  captured = new Set()
  portrait = false
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('portrait') ? portrait : false }))
  Object.assign(HTMLElement.prototype, {
    setPointerCapture(id: number) {
      captured.add(id)
    },
    releasePointerCapture(id: number) {
      captured.delete(id)
    },
    hasPointerCapture: (id: number) => captured.has(id),
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 200 })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 100 })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
  } as DOMRect)
})
afterEach(() => vi.useRealTimers())

const zone = (options: Options) => {
  const view = render(<Zone {...options} />)
  const element = view.getByTestId('zone')
  return { ...view, element, transform: () => element.style.transform }
}

const down = (el: Element, id: number, x: number, y: number, extra: PointerEventInit = {}) =>
  fireEvent.pointerDown(el, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch', ...extra })
const move = (el: Element, id: number, x: number, y: number, extra: PointerEventInit = {}) =>
  fireEvent.pointerMove(el, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch', ...extra })
const up = (el: Element, id: number, x: number, y: number) =>
  fireEvent.pointerUp(el, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch' })

describe('usePinchZoom : doigts', () => {
  it('par défaut : identité, glisser-déposer natif bloqué', () => {
    const { element, transform } = zone({ active: true })
    expect(transform()).toContain('scale(1)')
    const notPrevented = fireEvent.dragStart(element)
    expect(notPrevented).toBe(false)
  })

  it('un doigt sur une image non zoomée ne bouge rien ; un pointeur inconnu est ignoré', () => {
    const { element, transform } = zone({ active: true })
    move(element, 9, 5, 5)
    down(element, 1, 100, 50)
    move(element, 1, 120, 50)
    expect(transform()).toContain('scale(1)')
  })

  it('deux doigts pincent, jusqu’à ×6 au plus, jamais sous ×1', () => {
    const { element, transform } = zone({ active: true })
    down(element, 1, 90, 50)
    down(element, 2, 110, 50)
    move(element, 2, 130, 50)
    expect(transform()).toContain('scale(2)')
    move(element, 2, 1000, 50)
    expect(transform()).toContain('scale(6)')
    move(element, 2, 91, 50)
    expect(transform()).toContain('scale(1)')
    up(element, 2, 91, 50)
    up(element, 1, 90, 50)
  })

  it('deux doigts posés au même point (écart nul) ne zooment pas', () => {
    const { element, transform } = zone({ active: true })
    down(element, 1, 100, 50)
    down(element, 2, 100, 50)
    move(element, 2, 130, 50)
    expect(transform()).toContain('scale(1)')
  })

  it('un doigt déplace une image déjà zoomée, bornée aux bords', () => {
    const { element, transform } = zone({ active: true })
    down(element, 1, 90, 50)
    down(element, 2, 110, 50)
    move(element, 2, 130, 50)
    up(element, 2, 130, 50)
    move(element, 1, 95, 50)
    expect(transform()).not.toContain('translate(0px, 0px)')
    move(element, 1, 5000, 5000)
    expect(transform()).toMatch(/translate\(100px, 50px\)/)
  })

  it('un geste annulé (cancel) relâche sans compter comme toucher', () => {
    const { element } = zone({ active: true })
    down(element, 1, 100, 50)
    fireEvent.pointerCancel(element, { pointerId: 1, clientX: 100, clientY: 50 })
    down(element, 1, 100, 50)
    up(element, 1, 100, 50)
    down(element, 1, 100, 50)
    up(element, 1, 100, 50)
  })

  it('double toucher : zoome sur le point, puis revient', () => {
    const { element, transform } = zone({ active: true })
    down(element, 1, 150, 50)
    up(element, 1, 150, 50)
    vi.setSystemTime(10_100)
    down(element, 1, 150, 50)
    up(element, 1, 150, 50)
    expect(transform()).toContain('scale(2.5)')
    vi.setSystemTime(10_500)
    down(element, 1, 150, 50)
    up(element, 1, 150, 50)
    vi.setSystemTime(10_600)
    down(element, 1, 150, 50)
    up(element, 1, 150, 50)
    expect(transform()).toContain('scale(1)')
  })

  it('deux touchers trop espacés dans le temps ou l’espace ne font pas un double toucher', () => {
    const { element, transform } = zone({ active: true })
    down(element, 1, 100, 50)
    up(element, 1, 100, 50)
    vi.setSystemTime(11_000)
    down(element, 1, 100, 50)
    up(element, 1, 100, 50)
    vi.setSystemTime(11_100)
    down(element, 1, 190, 50)
    up(element, 1, 190, 50)
    expect(transform()).toContain('scale(1)')
  })

  it('un toucher trop long ou qui a bougé n’est pas un toucher', () => {
    const { element, transform } = zone({ active: true })
    down(element, 1, 100, 50)
    vi.setSystemTime(10_400)
    up(element, 1, 100, 50)
    down(element, 1, 100, 50)
    up(element, 1, 140, 50)
    vi.setSystemTime(10_450)
    down(element, 1, 100, 50)
    up(element, 1, 100, 50)
    expect(transform()).toContain('scale(1)')
  })

  it('le second doigt d’un geste à deux doigts n’est pas un toucher', () => {
    const { element } = zone({ active: true })
    down(element, 1, 100, 50)
    down(element, 2, 120, 50)
    up(element, 2, 120, 50)
    up(element, 1, 100, 50)
  })

  it('un relâchement sans doigt connu ne casse rien', () => {
    const { element } = zone({ active: true })
    up(element, 7, 1, 1)
  })

  it('sans capture de pointeur possible, le geste continue', () => {
    HTMLElement.prototype.setPointerCapture = () => {
      throw new Error('non')
    }
    const { element } = zone({ active: true })
    down(element, 1, 100, 50)
    up(element, 1, 100, 50)
  })

  it('en portrait tourné, les gestes sont ramenés dans le repère de l’élément', () => {
    portrait = true
    const { element, transform } = zone({ active: true, rotated: true })
    down(element, 1, 100, 40)
    down(element, 2, 100, 60)
    move(element, 2, 100, 80)
    expect(transform()).toContain('scale(2)')
  })

  it('rotated=false garde les gestes tels quels même en portrait', () => {
    portrait = true
    const { element, transform } = zone({ active: true, rotated: false })
    down(element, 1, 90, 50)
    down(element, 2, 110, 50)
    move(element, 2, 130, 50)
    expect(transform()).toContain('scale(2)')
  })

  it('désactivé : le zoom et les doigts sont oubliés', () => {
    const view = render(<Zone active />)
    const element = view.getByTestId('zone')
    down(element, 1, 90, 50)
    down(element, 2, 110, 50)
    move(element, 2, 130, 50)
    expect(element.style.transform).toContain('scale(2)')
    view.rerender(<Zone active={false} />)
    expect(view.getByTestId('zone').style.transform).toContain('scale(1)')
    expect(fireEvent.pointerDown(view.getByTestId('zone'), { pointerId: 1 })).toBe(true)
  })

  it('un nouveau média (resetKey) remet le zoom à zéro', () => {
    const view = render(<Zone active resetKey="a" />)
    const element = view.getByTestId('zone')
    down(element, 1, 90, 50)
    down(element, 2, 110, 50)
    move(element, 2, 130, 50)
    view.rerender(<Zone active resetKey="b" />)
    expect(view.getByTestId('zone').style.transform).toContain('scale(1)')
  })
})

describe('usePinchZoom : molette et souris', () => {
  const wheelTo = (element: Element, deltaY: number, x = 100, y = 50) => fireEvent.wheel(element, { deltaY, clientX: x, clientY: y })

  it('la molette zoome autour du pointeur, bornée', () => {
    const { element, transform } = zone({ active: false, wheel: true })
    wheelTo(element, -500)
    expect(transform()).toMatch(/scale\(2\.1\d*\)/)
    wheelTo(element, -100000)
    expect(transform()).toContain('scale(6)')
    wheelTo(element, 100000)
    expect(transform()).toContain('scale(1)')
    expect(element.style.cursor).toBe('')
  })

  it('curseur « grab » tant que l’image est zoomée à la souris', () => {
    const { element } = zone({ active: false, wheel: true })
    wheelTo(element, -500)
    expect(element.style.cursor).toBe('grab')
  })

  it('la molette sans la vue en grand ni le mode molette ne fait rien', () => {
    const { element, transform } = zone({ active: false, wheel: false })
    wheelTo(element, -500)
    expect(transform()).toContain('scale(1)')
  })

  const mouse = (type: 'down' | 'move' | 'up' | 'cancel', element: Element, x: number, y: number, extra: PointerEventInit = {}) => {
    const init = { pointerId: 1, clientX: x, clientY: y, pointerType: 'mouse', button: 0, ...extra }
    if (type === 'down') fireEvent.pointerDown(element, init)
    else if (type === 'move') fireEvent.pointerMove(element, init)
    else if (type === 'up') fireEvent.pointerUp(element, init)
    else fireEvent.pointerCancel(element, init)
  }

  it('la souris déplace l’image zoomée après quelques pixels, et le clic qui suit est avalé', () => {
    const { element, transform } = zone({ active: false, wheel: true })
    wheelTo(element, -800)
    const before = transform()
    mouse('down', element, 100, 50)
    mouse('move', element, 101, 50)
    expect(transform()).toBe(before)
    mouse('move', element, 130, 50)
    expect(transform()).not.toBe(before)
    mouse('move', element, 135, 50)
    mouse('up', element, 130, 50)
    const onClick = vi.fn()
    window.addEventListener('click', onClick)
    fireEvent.click(element)
    expect(onClick).not.toHaveBeenCalled()
    window.removeEventListener('click', onClick)
  })

  it('l’avaleur de clic est retirée au tour suivant s’il n’y a pas de clic', () => {
    const { element } = zone({ active: false, wheel: true })
    wheelTo(element, -800)
    mouse('down', element, 100, 50)
    mouse('move', element, 130, 50)
    mouse('up', element, 130, 50)
    vi.advanceTimersByTime(1)
    const onClick = vi.fn()
    window.addEventListener('click', onClick)
    fireEvent.click(element)
    expect(onClick).toHaveBeenCalled()
    window.removeEventListener('click', onClick)
  })

  it('un simple clic (sans glisser) n’est pas avalé et relâche la capture', () => {
    const { element } = zone({ active: false, wheel: true })
    wheelTo(element, -800)
    mouse('down', element, 100, 50)
    mouse('up', element, 100, 50)
    mouse('cancel', element, 100, 50)
  })

  it('ignore le bouton droit, un doigt, une image non zoomée et un autre pointeur', () => {
    const { element, transform } = zone({ active: false, wheel: true })
    mouse('down', element, 100, 50)
    mouse('move', element, 150, 50)
    expect(transform()).toContain('scale(1)')
    wheelTo(element, -800)
    const before = transform()
    mouse('down', element, 100, 50, { button: 2 })
    mouse('down', element, 100, 50, { pointerType: 'touch' })
    mouse('move', element, 150, 50)
    expect(transform()).toBe(before)
    mouse('down', element, 100, 50)
    mouse('move', element, 150, 50, { pointerId: 2 })
    mouse('up', element, 150, 50)
    mouse('up', element, 150, 50)
    expect(transform()).toBe(before)
  })

  it('relâche la capture seulement si elle existe', () => {
    const { element } = zone({ active: false, wheel: true })
    wheelTo(element, -800)
    mouse('down', element, 100, 50)
    mouse('up', element, 100, 50)
  })

  it('le zoom est remis à zéro quand la molette est coupée', () => {
    const view = render(<Zone active={false} wheel />)
    const element = view.getByTestId('zone')
    wheelTo(element, -800)
    view.rerender(<Zone active={false} wheel={false} />)
    expect(view.getByTestId('zone').style.transform).toContain('scale(1)')
  })

  it('démonter retire l’écouteur de molette', () => {
    const { unmount } = zone({ active: false, wheel: true })
    expect(() => act(() => unmount())).not.toThrow()
  })
})
