import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import Timeline from './Timeline'
import { markerClass, pointStyle, spanStyle } from './helpers'
import type { TimelineMarker, TimelineProps } from './types'
import { CLIP_SPAN_TITLE, MARKER_IDLE_CLASS, MARKER_ONGOING_CLASS, MARKER_SELECTED_CLASS, NOW_LABEL, RANGE_LABEL } from './constants'

const marker = (extra: Partial<TimelineMarker> = {}): TimelineMarker => ({
  id: 'm1',
  x: 10,
  width: 5,
  text: 'Mouvement 10:00',
  selected: false,
  ongoing: false,
  ...extra,
})

type Range = '1h' | '6h'
const base = (): TimelineProps<Range> => ({
  ranges: [
    { id: '1h', label: '1 h' },
    { id: '6h', label: '6 h' },
  ],
  range: '1h',
  live: false,
  ticks: [{ x: 50, label: '10:30' }],
  markers: [],
  coverage: [{ x: 0, width: 40 }],
  cursorX: null,
  onRange: () => undefined,
  onNow: () => undefined,
  onSelect: () => undefined,
})

/** L axe est le second enfant de la racine. */
const axisOf = (container: HTMLElement) => container.firstElementChild?.children[1] as HTMLElement

describe('helpers', () => {
  it('markerClass : en cours, choisi, sinon au repos', () => {
    expect(markerClass(marker({ ongoing: true, selected: true }))).toContain(MARKER_ONGOING_CLASS)
    expect(markerClass(marker({ selected: true }))).toContain(MARKER_SELECTED_CLASS)
    expect(markerClass(marker())).toContain(MARKER_IDLE_CLASS)
  })

  it('markerClass : une classe de base différente à la verticale', () => {
    expect(markerClass(marker(), true)).not.toBe(markerClass(marker(), false))
    expect(markerClass(marker(), true)).toContain(MARKER_IDLE_CLASS)
  })

  it('pointStyle : à gauche à l horizontale, depuis le haut à la verticale (le plus récent en haut)', () => {
    expect(pointStyle(30, false)).toEqual({ left: '30%' })
    expect(pointStyle(30, true)).toEqual({ top: '70%' })
  })

  it('spanStyle : même règle pour une plage', () => {
    expect(spanStyle(10, 20, false)).toEqual({ left: '10%', width: '20%' })
    expect(spanStyle(10, 20, true)).toEqual({ top: '70%', height: '20%' })
  })
})

describe('Timeline commandes', () => {
  it('« Direct » est mis en avant quand la fenêtre suit l heure, et appelle onNow', () => {
    const onNow = vi.fn()
    const { rerender } = render(<Timeline {...base()} onNow={onNow} />)
    const idle = screen.getByRole('button', { name: NOW_LABEL }).className
    fireEvent.click(screen.getByRole('button', { name: NOW_LABEL }))
    expect(onNow).toHaveBeenCalledTimes(1)
    rerender(<Timeline {...base()} live onNow={onNow} />)
    expect(screen.getByRole('button', { name: NOW_LABEL }).className).not.toBe(idle)
  })

  it('les fenêtres sont des onglets ; en choisir une appelle onRange', () => {
    const onRange = vi.fn()
    render(<Timeline {...base()} onRange={onRange} />)
    expect(screen.getByRole('tablist', { name: RANGE_LABEL })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '1 h' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: '6 h' }))
    expect(onRange).toHaveBeenCalledWith('6h')
  })
})

describe('Timeline axe', () => {
  it('prend la hauteur de son parent avec fill, une hauteur fixe sinon', () => {
    const { container, rerender } = render(<Timeline {...base()} />)
    const normal = [container.firstElementChild?.className, axisOf(container).className]
    rerender(<Timeline {...base()} fill />)
    expect(container.firstElementChild?.className).not.toBe(normal[0])
    // fill ne change l axe qu à la verticale.
    expect(axisOf(container).className).toBe(normal[1])
    rerender(<Timeline {...base()} vertical />)
    const vertical = axisOf(container).className
    expect(vertical).not.toBe(normal[1])
    rerender(<Timeline {...base()} vertical fill />)
    expect(axisOf(container).className).not.toBe(vertical)
  })

  it('transmet les événements du pointeur à l axe (annulation comprise)', () => {
    const onPointerDown = vi.fn()
    const onPointerMove = vi.fn()
    const onPointerUp = vi.fn()
    const { container } = render(<Timeline {...base()} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />)
    const axis = axisOf(container)
    fireEvent.pointerDown(axis)
    fireEvent.pointerMove(axis)
    fireEvent.pointerUp(axis)
    fireEvent.pointerCancel(axis)
    expect(onPointerDown).toHaveBeenCalledTimes(1)
    expect(onPointerMove).toHaveBeenCalledTimes(1)
    expect(onPointerUp).toHaveBeenCalledTimes(2)
  })

  it('donne l axe au parent par axisRef', () => {
    const axisRef = createRef<HTMLDivElement>()
    const { container } = render(<Timeline {...base()} axisRef={axisRef} />)
    expect(axisRef.current).toBe(axisOf(container))
  })

  it('place graduations et plages couvertes, à l horizontale', () => {
    const { container } = render(<Timeline {...base()} />)
    const tick = screen.getByText('10:30').parentElement as HTMLElement
    expect(tick.style.left).toBe('50%')
    const coverage = axisOf(container).children[0] as HTMLElement
    expect(coverage.style.left).toBe('0%')
    expect(coverage.style.width).toBe('40%')
  })

  it('place graduations et plages couvertes, à la verticale (le plus récent en haut)', () => {
    const { container } = render(<Timeline {...base()} vertical />)
    expect((screen.getByText('10:30').parentElement as HTMLElement).style.top).toBe('50%')
    const coverage = axisOf(container).children[0] as HTMLElement
    expect(coverage.style.top).toBe('60%')
    expect(coverage.style.height).toBe('40%')
  })

  it('« maintenant » : futur, trait et repère, seulement avec nowX', () => {
    const { container, rerender } = render(<Timeline {...base()} />)
    const without = axisOf(container).children.length
    rerender(<Timeline {...base()} nowX={80} />)
    expect(axisOf(container).children.length).toBe(without + 2)
    expect((axisOf(container).lastElementChild as HTMLElement).style.left).toBe('80%')
    expect((axisOf(container).children[0] as HTMLElement).style.left).toBe('80%')
  })

  it('« maintenant » à la verticale : le futur est au-dessus', () => {
    const { container } = render(<Timeline {...base()} vertical nowX={80} />)
    expect((axisOf(container).children[0] as HTMLElement).style.height).toBe('20%')
    expect((axisOf(container).lastElementChild as HTMLElement).style.top).toBe('20%')
  })

  it('nowX à 0 est une vraie position', () => {
    const { container } = render(<Timeline {...base()} nowX={0} />)
    expect((axisOf(container).lastElementChild as HTMLElement).style.left).toBe('0%')
  })

  it('étendue du clip ouvert, avec infobulle', () => {
    const { rerender } = render(<Timeline {...base()} />)
    expect(screen.queryByTitle(CLIP_SPAN_TITLE)).toBeNull()
    rerender(<Timeline {...base()} clipSpan={{ x: 20, width: 10 }} />)
    expect(screen.getByTitle(CLIP_SPAN_TITLE).style.left).toBe('20%')
    rerender(<Timeline {...base()} vertical clipSpan={{ x: 20, width: 10 }} />)
    expect(screen.getByTitle(CLIP_SPAN_TITLE).style.top).toBe('70%')
  })

  it('curseur, à l horizontale et à la verticale, y compris en 0', () => {
    const { container, rerender } = render(<Timeline {...base()} cursorX={25} />)
    const axis = axisOf(container)
    expect((axis.lastElementChild as HTMLElement).style.left).toBe('25%')
    rerender(<Timeline {...base()} vertical cursorX={25} />)
    expect((axisOf(container).lastElementChild as HTMLElement).style.top).toBe('75%')
    rerender(<Timeline {...base()} cursorX={0} />)
    expect((axisOf(container).lastElementChild as HTMLElement).style.left).toBe('0%')
    rerender(<Timeline {...base()} cursorX={null} />)
    expect(axisOf(container).children.length).toBe(2)
  })
})

describe('Timeline blocs', () => {
  it('un bouton par bloc : nom, état, position', () => {
    render(<Timeline {...base()} markers={[marker({ selected: true }), marker({ id: 'm2', text: 'Autre', x: 60 })]} />)
    const first = screen.getByRole('button', { name: 'Mouvement 10:00' })
    expect(first).toHaveAttribute('aria-pressed', 'true')
    expect(first).toHaveAttribute('title', 'Mouvement 10:00')
    expect(first.style.left).toBe('10%')
    expect(first.style.width).toBe('5%')
    expect(screen.getByRole('button', { name: 'Autre' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('un clic sur un bloc donne son identifiant', () => {
    const onSelect = vi.fn()
    render(<Timeline {...base()} markers={[marker()]} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mouvement 10:00' }))
    expect(onSelect).toHaveBeenCalledWith('m1')
  })

  it('appuyer ou relâcher sur un bloc n atteint pas l axe', () => {
    const onPointerDown = vi.fn()
    const onPointerUp = vi.fn()
    render(<Timeline {...base()} markers={[marker()]} onPointerDown={onPointerDown} onPointerUp={onPointerUp} />)
    const block = screen.getByRole('button', { name: 'Mouvement 10:00' })
    fireEvent.pointerDown(block)
    fireEvent.pointerUp(block)
    expect(onPointerDown).not.toHaveBeenCalled()
    expect(onPointerUp).not.toHaveBeenCalled()
  })

  it('à la verticale, un bloc est posé depuis le haut avec sa hauteur', () => {
    render(<Timeline {...base()} vertical markers={[marker()]} />)
    const block = screen.getByRole('button', { name: 'Mouvement 10:00' })
    expect(block.style.top).toBe('85%')
    expect(block.style.height).toBe('5%')
  })
})

describe('Timeline : extra', () => {
  it('le contenu extra suit les onglets de fenêtre', () => {
    render(<Timeline {...base()} extra={<button>vitesse</button>} />)
    expect(screen.getByRole('button', { name: 'vitesse' })).toBeInTheDocument()
  })

  it('sans extra, rien de plus', () => {
    render(<Timeline {...base()} />)
    expect(screen.queryByRole('button', { name: 'vitesse' })).toBeNull()
  })
})
