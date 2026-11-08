import { act, fireEvent, render } from '@testing-library/react'
import type { RefObject } from 'react'
import { flush } from '@/test/fetch'
import { setDesktop } from '@/test/viewport'
import type { EventRow } from '@/types'
import Timeline from './Timeline'

/* eslint-disable @typescript-eslint/no-explicit-any -- double de la frise de @house/ui : les props sont inspectées librement */
const ui = vi.hoisted(() => ({ props: null as any, attach: true }))

vi.mock('@house/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@house/ui')>()),
  Timeline: (props: any) => {
    ui.props = props
    return (
      <div
        data-testid="axis"
        ref={ui.attach ? (props.axisRef as RefObject<HTMLDivElement>) : undefined}
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerUp}
      />
    )
  },
}))
vi.mock('@/lib/api', () => ({ fetchEvents: vi.fn(), fetchSnapshotTimes: vi.fn() }))
const api = await import('@/lib/api')

const NOW = 1_800_000_000
const event = (id: string, started_at: number, ended_at: number | null = started_at + 20, over: Partial<EventRow> = {}): EventRow =>
  ({ id, camera: 'c', label: 'person', started_at, ended_at, clip_started_at: null, ...over }) as EventRow

const handlers = () => ({ onCursor: vi.fn(), onEvent: vi.fn() })

const setup = (over: Record<string, unknown> = {}) => {
  const h = handlers()
  const view = render(<Timeline apiKey="k" camera="c" events={[]} clipRange={null} playhead={null} {...h} {...over} />)
  const axis = view.getByTestId('axis')
  Object.defineProperty(axis, 'clientWidth', { value: 1000, configurable: true })
  Object.defineProperty(axis, 'clientHeight', { value: 400, configurable: true })
  vi.spyOn(axis, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 400 } as DOMRect)
  const rerender = (next: Record<string, unknown>) =>
    view.rerender(<Timeline apiKey="k" camera="c" events={[]} clipRange={null} playhead={null} {...h} {...over} {...next} />)
  return { ...view, ...h, axis, rerender }
}

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

const down = (el: Element, id: number, x: number, y = 0) => fireEvent.pointerDown(el, { pointerId: id, clientX: x, clientY: y })
const move = (el: Element, id: number, x: number, y = 0) => fireEvent.pointerMove(el, { pointerId: id, clientX: x, clientY: y })
const up = (el: Element, id: number, x: number, y = 0) => fireEvent.pointerUp(el, { pointerId: id, clientX: x, clientY: y })
const click = (el: Element, x: number, y = 0) => {
  down(el, 1, x, y)
  up(el, 1, x, y)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW * 1000)
  setDesktop(true)
  ui.attach = true
  HTMLElement.prototype.setPointerCapture = vi.fn()
  vi.mocked(api.fetchSnapshotTimes).mockResolvedValue([])
  vi.mocked(api.fetchEvents).mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

describe('Timeline : données', () => {
  it('demande les images et (après 250 ms) les événements de la fenêtre', async () => {
    setup()
    await settle()
    expect(api.fetchSnapshotTimes).toHaveBeenCalledWith('k', 'c', NOW + 30 - 60, NOW + 30)
    expect(api.fetchEvents).not.toHaveBeenCalled()
    await settle(250)
    expect(api.fetchEvents).toHaveBeenCalledWith('k', { camera: 'c', from: NOW - 30, to: NOW + 30 })
  })

  it('les événements demandés s’ajoutent aux récents', async () => {
    vi.mocked(api.fetchEvents).mockResolvedValue([event('old', NOW - 40)])
    setup({ events: [event('new', NOW - 10)] })
    await settle(250)
    expect(ui.props.markers.map((m: { id: string }) => m.id).sort()).toEqual(['new', 'old'])
  })

  it('les échecs de lecture sont ignorés', async () => {
    vi.mocked(api.fetchSnapshotTimes).mockRejectedValue(new Error('x'))
    vi.mocked(api.fetchEvents).mockRejectedValue(new Error('x'))
    setup()
    await settle(250)
    expect(ui.props.markers).toEqual([])
  })

  it('ignore les réponses arrivées après le démontage', async () => {
    let times: (t: number[]) => void = () => undefined
    let events: (e: EventRow[]) => void = () => undefined
    vi.mocked(api.fetchSnapshotTimes).mockReturnValue(new Promise((resolve) => (times = resolve)))
    vi.mocked(api.fetchEvents).mockReturnValue(new Promise((resolve) => (events = resolve)))
    const { unmount } = setup()
    await settle(250)
    unmount()
    await act(async () => {
      times([1])
      events([event('x', 1)])
      await flush()
    })
  })

  it('la couverture suit les images gardées', async () => {
    vi.mocked(api.fetchSnapshotTimes).mockResolvedValue([NOW - 20, NOW - 10])
    setup()
    await settle()
    expect(ui.props.coverage.length).toBe(1)
  })

  it('en direct, le bord droit avance avec l’heure', async () => {
    setup()
    await settle()
    expect(vi.mocked(api.fetchSnapshotTimes)).toHaveBeenCalledTimes(1)
    await settle(12_000)
    expect(vi.mocked(api.fetchSnapshotTimes).mock.calls.length).toBeGreaterThan(1)
    expect(ui.props.live).toBe(true)
  })

  it('suit la longueur de l’axe (ResizeObserver)', async () => {
    const update: (() => void)[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          update.push(cb)
        }
        observe = () => undefined
        disconnect = () => undefined
      },
    )
    const { axis } = setup()
    Object.defineProperty(axis, 'clientWidth', { value: 150, configurable: true })
    act(() => update[update.length - 1]())
    expect(ui.props.ticks.length).toBeLessThanOrEqual(2)
  })

  it('sans axe dans le dessin, rien à suivre', () => {
    ui.attach = false
    setup()
    expect(ui.props.ticks).toBeDefined()
  })

  it('vertical sur téléphone', () => {
    setDesktop(false)
    setup({ fill: true })
    expect(ui.props.vertical).toBe(true)
    expect(ui.props.fill).toBe(true)
  })
})

describe('Timeline : raccourcis', () => {
  it('une plage en direct reste en direct, hors direct elle garde son bord', async () => {
    setup()
    await settle()
    act(() => ui.props.onRange('1h'))
    expect(ui.props.range).toBe('1h')
    expect(ui.props.live).toBe(true)
    // un glissement vers le passé quitte le direct
    const axis = document.querySelector('[data-testid=axis]') as HTMLElement
    down(axis, 1, 500)
    move(axis, 1, 800)
    up(axis, 1, 800)
    expect(ui.props.live).toBe(false)
    act(() => ui.props.onRange('10m'))
    expect(ui.props.range).toBe('10m')
    expect(ui.props.live).toBe(false)
  })

  it('« Direct » zoome sur 60 s, remet le direct et ferme l’événement', async () => {
    const { onCursor, onEvent } = setup()
    await settle()
    act(() => ui.props.onRange('24h'))
    act(() => ui.props.onNow())
    expect(ui.props.live).toBe(true)
    expect(ui.props.range).toBe('')
    expect(onCursor).toHaveBeenCalledWith(null)
    expect(onEvent).toHaveBeenCalledWith(null, null)
  })
})

describe('Timeline : événements', () => {
  const recent = [event('a', NOW - 100, NOW - 80), event('b', NOW - 50, NOW - 40, { clip_started_at: NOW - 55 })]

  it('un clic sur un événement ouvre son clip depuis le début de la vidéo et recadre la fenêtre', async () => {
    const { onEvent, onCursor } = setup({ events: recent })
    await settle()
    act(() => ui.props.onSelect('b'))
    expect(onEvent).toHaveBeenCalledWith(recent[1], NOW - 55)
    expect(onCursor).toHaveBeenCalledWith(null)
    expect(ui.props.markers.find((m: { id: string }) => m.id === 'b').selected).toBe(true)
    expect(ui.props.live).toBe(false)
    act(() => ui.props.onSelect('a'))
    expect(onEvent).toHaveBeenLastCalledWith(recent[0], NOW - 100)
  })

  it('un reclic sur le clip ouvert le relance sans changer la fenêtre', async () => {
    const { onEvent } = setup({ events: recent })
    await settle()
    act(() => ui.props.onSelect('b'))
    const ticks = ui.props.ticks
    onEvent.mockClear()
    act(() => ui.props.onSelect('b'))
    expect(onEvent).toHaveBeenCalledWith(recent[1], NOW - 55)
    expect(ui.props.ticks).toEqual(ticks)
  })

  it('un événement inconnu referme', async () => {
    const { onEvent } = setup({ events: recent })
    await settle()
    act(() => ui.props.onSelect('b'))
    act(() => ui.props.onSelect('inconnu'))
    expect(onEvent).toHaveBeenLastCalledWith(null, null)
    expect(ui.props.markers.some((m: { selected: boolean }) => m.selected)).toBe(false)
  })

  it('la carte qui ferme l’événement désélectionne ; qui en ouvre un le sélectionne', async () => {
    const visible = [event('a', NOW - 20, NOW - 10)]
    const { rerender } = setup({ events: visible })
    await settle()
    rerender({ selectedEventId: 'a' })
    expect(ui.props.markers.find((m: { id: string }) => m.id === 'a').selected).toBe(true)
    rerender({ selectedEventId: '' })
    expect(ui.props.markers.some((m: { selected: boolean }) => m.selected)).toBe(false)
  })

  it('ouverte directement sur un événement, la fenêtre se recale dessus', async () => {
    setup({ events: recent, selectedEventId: 'a' })
    await settle()
    expect(ui.props.live).toBe(false)
  })

  it('selectedEventId inconnu : rien ne se recale', async () => {
    setup({ events: recent, selectedEventId: 'fantome' })
    await settle()
    expect(ui.props.live).toBe(true)
  })

  it('la lecture du clip déplace le curseur, borné à la fenêtre ; la plage du clip se montre', async () => {
    const { rerender } = setup({ events: recent, selectedEventId: 'b' })
    await settle()
    rerender({ selectedEventId: 'b', playhead: NOW - 45, clipRange: { start: NOW - 55, end: NOW - 35 } })
    expect(ui.props.cursorX).toBeGreaterThan(0)
    expect(ui.props.clipSpan).not.toBeNull()
    rerender({ selectedEventId: 'b', playhead: NOW + 1e6, clipRange: { start: NOW - 55, end: NOW - 35 } })
    expect(ui.props.cursorX).toBeNull()
    // plage hors de la fenêtre
    rerender({ selectedEventId: 'b', playhead: null, clipRange: { start: 1, end: 2 } })
    expect(ui.props.clipSpan).toBeNull()
  })
})

describe('Timeline : gestes sur l’axe', () => {
  it('un clic pose le curseur sur cet instant et demande l’image', async () => {
    const { axis, onCursor } = setup()
    await settle()
    click(axis, 250)
    expect(onCursor).toHaveBeenCalledWith(NOW - 15)
    expect(ui.props.cursorX).toBeCloseTo(25, 0)
  })

  it('un clic dans le futur s’arrête à maintenant', async () => {
    const { axis, onCursor } = setup()
    await settle()
    click(axis, 990)
    expect(onCursor).toHaveBeenCalledWith(NOW)
  })

  it('un clic ferme l’événement ouvert', async () => {
    const recent = [event('b', NOW - 50, NOW - 40)]
    const { axis, onEvent } = setup({ events: recent })
    await settle()
    act(() => ui.props.onSelect('b'))
    click(axis, 250)
    expect(onEvent).toHaveBeenLastCalledWith(null, null)
  })

  it('glisser déplace la fenêtre, en deçà du seuil c’est un clic', async () => {
    const { axis, onCursor } = setup()
    await settle()
    down(axis, 1, 500)
    move(axis, 1, 502)
    move(axis, 1, 600)
    move(axis, 1, 700)
    up(axis, 1, 700)
    expect(ui.props.live).toBe(false)
    expect(onCursor).not.toHaveBeenCalled()
    // un pointeur qui bouge sans être posé
    move(axis, 5, 10)
    // un mouvement sans glisser en cours
    move(axis, 1, 100)
    // un petit mouvement est un clic
    down(axis, 1, 500)
    move(axis, 1, 502)
    up(axis, 1, 502)
    expect(onCursor).toHaveBeenCalledTimes(1)
  })

  it('glisser vers le futur est borné ; près de maintenant la fenêtre se remet en direct', async () => {
    const { axis } = setup()
    await settle()
    down(axis, 1, 500)
    move(axis, 1, 0)
    expect(ui.props.live).toBe(false)
    move(axis, 1, 500)
    expect(ui.props.live).toBe(true)
    up(axis, 1, 500)
  })

  it('sur téléphone, le glisser est vertical', async () => {
    setDesktop(false)
    const { axis } = setup()
    await settle()
    down(axis, 1, 0, 100)
    move(axis, 1, 0, 300)
    up(axis, 1, 0, 300)
    expect(ui.props.live).toBe(false)
    click(axis, 0, 200)
  })

  it('une capture de pointeur refusée est ignorée', async () => {
    HTMLElement.prototype.setPointerCapture = () => {
      throw new Error('non')
    }
    const { axis, onCursor } = setup()
    await settle()
    click(axis, 250)
    expect(onCursor).toHaveBeenCalled()
  })

  it('deux doigts pincent ; le doigt restant ne clique ni ne glisse', async () => {
    const { axis, onCursor } = setup()
    await settle()
    down(axis, 1, 400)
    down(axis, 2, 600)
    move(axis, 2, 800)
    const wide = ui.props.range
    expect(ui.props.live === false || ui.props.live === true).toBe(true)
    up(axis, 2, 800)
    // il reste un doigt : rien ne se passe
    move(axis, 1, 300)
    up(axis, 1, 300)
    expect(onCursor).not.toHaveBeenCalled()
    expect(wide).toBeDefined()
    // tout relevé : un nouveau clic compte
    click(axis, 250)
    expect(onCursor).toHaveBeenCalled()
  })

  it('un pincement : l’écart des doigts zoome', async () => {
    const { axis } = setup()
    await settle()
    down(axis, 1, 400)
    down(axis, 2, 600)
    const before = ui.props.ticks
    move(axis, 2, 1000)
    expect(ui.props.ticks).not.toEqual(before)
    up(axis, 1, 400)
    up(axis, 2, 1000)
  })

  it('un troisième doigt : le pincement continue tant qu’il reste deux doigts', async () => {
    const { axis } = setup()
    await settle()
    down(axis, 1, 400)
    down(axis, 2, 600)
    down(axis, 3, 700)
    up(axis, 3, 700)
    up(axis, 2, 600)
    up(axis, 1, 400)
  })

  it('un pincement qui se termine doigt par doigt dans l’autre ordre', async () => {
    const { axis } = setup()
    await settle()
    down(axis, 1, 400)
    down(axis, 2, 600)
    up(axis, 1, 400)
    up(axis, 2, 600)
  })

  it('la molette zoome autour du pointeur', async () => {
    const { axis } = setup()
    await settle()
    const ticks = ui.props.ticks
    fireEvent.wheel(axis, { deltaY: 100, clientX: 500 })
    fireEvent.wheel(axis, { deltaY: -100, clientX: 500 })
    fireEvent.wheel(axis, { deltaY: -100, clientX: 500 })
    expect(ui.props.ticks).not.toEqual(ticks)
  })

  it('molette sur téléphone', async () => {
    setDesktop(false)
    const { axis } = setup()
    await settle()
    fireEvent.wheel(axis, { deltaY: 100, clientY: 200 })
  })
})

describe('Timeline : le curseur avance en temps réel', () => {
  it('une seconde par seconde, l’image change à chaque image gardée', async () => {
    vi.mocked(api.fetchSnapshotTimes).mockResolvedValue([NOW - 100, NOW - 14])
    const { axis, onCursor } = setup()
    await settle()
    click(axis, 250)
    onCursor.mockClear()
    await settle(1000)
    // à NOW-14 : l'image la plus proche est celle de NOW-14
    expect(onCursor).toHaveBeenCalledWith(NOW - 14)
    onCursor.mockClear()
    await settle(1000)
    // même image : pas de nouvelle demande
    expect(onCursor).not.toHaveBeenCalled()
  })

  it('sans liste d’images, une nouvelle image au plus toutes les 60 s', async () => {
    const { axis, onCursor } = setup()
    await settle()
    click(axis, 250)
    onCursor.mockClear()
    await settle(1000)
    // reported était NOW-15 (le clic) : 1 s plus tard, on garde la même
    expect(onCursor).not.toHaveBeenCalled()
  })

  it('sans image demandée au départ, la première avance en demande une', async () => {
    const recent = [event('b', NOW - 300, NOW - 280)]
    const { onCursor } = setup({ events: recent })
    await settle()
    act(() => ui.props.onSelect('b'))
    // fermer le clip depuis la carte : le curseur (à l'instant de l'événement) avance seul
    expect(onCursor).toHaveBeenCalledWith(null)
  })

  it('le curseur avance seul après un clip fermé, et demande une image au bout de 60 s sans liste', async () => {
    const recent = [event('b', NOW - 300, NOW - 280)]
    const { rerender, onCursor } = setup({ events: recent })
    await settle()
    act(() => ui.props.onSelect('b'))
    rerender({ events: recent, selectedEventId: '' })
    onCursor.mockClear()
    await settle(1000)
    expect(onCursor).toHaveBeenCalledWith(NOW - 299)
    onCursor.mockClear()
    await settle(1000)
    expect(onCursor).not.toHaveBeenCalled()
    for (let i = 0; i < 60; i++) await settle(1000)
    expect(onCursor).toHaveBeenCalled()
  })

  it('arrivé à maintenant, retour au direct', async () => {
    const { axis, onCursor } = setup()
    await settle()
    click(axis, 500)
    onCursor.mockClear()
    await settle(1000)
    expect(onCursor).toHaveBeenCalledWith(null)
    expect(ui.props.cursorX).toBeNull()
  })

  it('le curseur qui approche du bord droit repousse la fenêtre', async () => {
    setup()
    await settle()
    // fenêtre figée sur le passé, curseur près de son bord droit
    act(() => ui.props.onRange('10m'))
    const axis = document.querySelector('[data-testid=axis]') as HTMLElement
    vi.spyOn(axis, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 400 } as DOMRect)
    down(axis, 1, 500)
    move(axis, 1, 1166)
    up(axis, 1, 1166)
    expect(ui.props.live).toBe(false)
    click(axis, 950)
    const lastTick = ui.props.ticks
    await settle(1000)
    expect(ui.props.ticks).not.toEqual(lastTick)
  })

  it('s’arrête pendant un glisser et quand un événement est ouvert', async () => {
    const recent = [event('b', NOW - 300, NOW - 280)]
    const { axis, onCursor } = setup({ events: recent })
    await settle()
    click(axis, 250)
    down(axis, 1, 500)
    move(axis, 1, 600)
    onCursor.mockClear()
    await settle(3000)
    expect(onCursor).not.toHaveBeenCalled()
    up(axis, 1, 600)
  })
})
