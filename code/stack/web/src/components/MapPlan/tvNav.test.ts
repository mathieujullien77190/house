import type { Map as MapLibreMap } from 'maplibre-gl'
import type { EditContext } from './edit'
import { attachTvNavigation } from './tvNav'

interface Feature {
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: unknown }
}

/** Un appareil à (x, y) pixels : la fausse carte projette longitude et latitude telles quelles. */
const hit = (kind: string, id: string, x: number, y: number, extra: Record<string, unknown> = {}): Feature => ({
  properties: { kind, id, ...extra },
  geometry: { type: 'Point', coordinates: [x, y] },
})

const setup = (features: Feature[], options: { saisie?: boolean; hoverLayers?: boolean } = {}) => {
  const { saisie = true, hoverLayers = true } = options
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
  const added: string[] = []
  const filters: [string, unknown][] = []
  const state = { features }
  const map = {
    getLayer: (id: string) => (id === 'plan-saisie' ? saisie : id.startsWith('plan-survol') ? hoverLayers : undefined),
    queryRenderedFeatures: () => state.features,
    project: ([x, y]: [number, number]) => ({ x, y }),
    getSource: (id: string) => sources.get(id),
    addSource: (id: string) => {
      added.push(id)
      sources.set(id, { setData: vi.fn() })
    },
    addLayer: vi.fn(),
    setFilter: (id: string, filter: unknown) => filters.push([id, filter]),
    getCanvas: () => ({ clientWidth: 1000, clientHeight: 1000 }),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  }
  const handlers = {
    onSelectCamera: vi.fn(),
    onOpenCamera: vi.fn(),
    onToggleLamp: vi.fn(),
    onTogglePlug: vi.fn(),
    onOpenPlug: vi.fn(),
    onToggleShutter: vi.fn(),
    onOpenShutter: vi.fn(),
    onToggleEmoji: vi.fn(),
    onOpenEmoji: vi.fn(),
    onToggleDecor: vi.fn(),
    onOpenDecor: vi.fn(),
    onToggleAc: vi.fn(),
    onOpenAc: vi.fn(),
  }
  const context = { ...handlers } as unknown as EditContext
  const detach = attachTvNavigation(map as unknown as MapLibreMap, () => context)
  const ring = () => sources.get('plan-tv-focus')?.setData.mock.calls.at(-1)?.[0] as { features: { geometry: { coordinates: number[] } }[] }
  return { map, handlers, detach, state, sources, added, filters, ring }
}

const press = (key: string, target: EventTarget = window) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}
const ringAt = (s: ReturnType<typeof setup>) => s.ring().features[0].geometry.coordinates

afterEach(() => {
  delete document.body.dataset.tvOverlay
})

describe('tvNav : les flèches', () => {
  it('la première flèche va à l’appareil le plus proche du centre ; le cadre est créé une fois', () => {
    const s = setup([hit('camera-hit', 'a', 100, 100), hit('lamp-hit', 'b', 480, 520), hit('plug-hit', 'c', 900, 900)])
    const event = press('ArrowRight')
    expect(event.defaultPrevented).toBe(true)
    expect(ringAt(s)).toEqual([480, 520])
    press('ArrowRight')
    expect(s.added).toEqual(['plan-tv-focus'])
    expect(s.filters.at(-1)?.[0]).toBe('plan-survol-prises')
    s.detach()
  })

  it('chaque direction choisit l’appareil devant, de préférence bien aligné ; rien devant : on reste', () => {
    const s = setup([
      hit('lamp-hit', 'centre', 500, 500),
      hit('lamp-hit', 'droite', 700, 500),
      hit('lamp-hit', 'droite-haut', 650, 300),
      hit('lamp-hit', 'gauche', 300, 510),
      hit('lamp-hit', 'bas', 500, 800),
      hit('lamp-hit', 'haut', 495, 200),
    ])
    press('ArrowDown')
    expect(ringAt(s)).toEqual([500, 500])
    press('ArrowRight')
    expect(ringAt(s)).toEqual([700, 500])
    press('ArrowRight')
    expect(ringAt(s)).toEqual([700, 500])
    press('ArrowLeft')
    expect(ringAt(s)).toEqual([500, 500])
    press('ArrowLeft')
    expect(ringAt(s)).toEqual([300, 510])
    press('ArrowRight')
    press('ArrowDown')
    expect(ringAt(s)).toEqual([500, 800])
    press('ArrowUp')
    press('ArrowUp')
    expect(ringAt(s)).toEqual([495, 200])
    s.detach()
  })

  it('seuls les appareils où un clic fait quelque chose, une fois, sont atteints', () => {
    const s = setup([
      hit('sensor-hit', 'capteur', 500, 500),
      hit('decor-hit', 'inerte', 510, 500, { clickable: 0 }),
      hit('camera-hit', 'eteinte', 520, 500, { inactive: 1 }),
      { properties: { kind: 'lamp-hit', id: 'zone' }, geometry: { type: 'Polygon', coordinates: [] } },
      hit('decor-hit', 'porte', 530, 500, { clickable: 1 }),
      hit('decor-hit', 'porte', 531, 500, { clickable: 1 }),
      { properties: { id: 'sans-genre' }, geometry: { type: 'Point', coordinates: [1, 1] } },
    ])
    press('ArrowRight')
    expect(ringAt(s)).toEqual([530, 500])
    // pas d'autre appareil devant : la flèche suivante ne bouge pas
    press('ArrowRight')
    expect(ringAt(s)).toEqual([530, 500])
    s.detach()
  })

  it('un appareil sans calque de survol (décor) n’en allume pas ; les calques absents sont ignorés', () => {
    const s = setup([hit('decor-hit', 'porte', 500, 500, { clickable: 1 }), hit('lamp-hit', 'l', 600, 500)], { hoverLayers: false })
    press('ArrowRight')
    press('ArrowRight')
    expect(s.filters).toEqual([])
    s.detach()
  })

  it('le survol suit : l’ancien appareil est remis à plat, le nouveau est allumé', () => {
    const s = setup([hit('lamp-hit', 'a', 500, 500), hit('camera-hit', 'b', 600, 500), hit('decor-hit', 'c', 700, 500, { clickable: 1 })])
    press('ArrowRight')
    press('ArrowRight')
    press('ArrowRight')
    expect(s.filters.map(([id]) => id)).toEqual(['plan-survol-lampes', 'plan-survol-lampes', 'plan-survol-cameras', 'plan-survol-cameras'])
    s.detach()
  })

  it('sans appareil, ou sans calque de saisie : rien ne bouge et la touche n’est pas prise', () => {
    const none = setup([])
    expect(press('ArrowRight').defaultPrevented).toBe(false)
    none.detach()
    const noLayer = setup([hit('lamp-hit', 'a', 500, 500)], { saisie: false })
    expect(press('ArrowRight').defaultPrevented).toBe(false)
    expect(noLayer.added).toEqual([])
    noLayer.detach()
  })

  it('l’appareil où on était n’est plus à l’écran : on repart du plus proche du centre', () => {
    const s = setup([hit('lamp-hit', 'a', 100, 100), hit('lamp-hit', 'b', 520, 500)])
    press('ArrowRight')
    expect(ringAt(s)).toEqual([520, 500])
    s.state.features = [hit('lamp-hit', 'c', 900, 900), hit('lamp-hit', 'd', 480, 480)]
    press('ArrowRight')
    expect(ringAt(s)).toEqual([480, 480])
    s.detach()
  })

  it('un champ de saisie garde ses touches ; un direct en grand suspend la carte', () => {
    const s = setup([hit('lamp-hit', 'a', 500, 500)])
    const input = document.createElement('input')
    document.body.append(input)
    expect(press('ArrowRight', input).defaultPrevented).toBe(false)
    input.remove()
    document.body.dataset.tvOverlay = '1'
    expect(press('ArrowRight').defaultPrevented).toBe(false)
    expect(s.added).toEqual([])
    s.detach()
  })

  it('une autre touche est laissée', () => {
    const s = setup([hit('lamp-hit', 'a', 500, 500)])
    expect(press('a').defaultPrevented).toBe(false)
    s.detach()
  })
})

describe('tvNav : OK', () => {
  const choose = (s: ReturnType<typeof setup>) => {
    press('ArrowRight')
    return s
  }

  it('sans appareil choisi, OK ne fait rien ; si l’appareil a disparu non plus', () => {
    const s = setup([hit('camera-hit', 'a', 500, 500)])
    expect(press('Enter').defaultPrevented).toBe(false)
    press('ArrowRight')
    s.state.features = []
    expect(press('Enter').defaultPrevented).toBe(false)
    expect(s.handlers.onSelectCamera).not.toHaveBeenCalled()
    s.detach()
  })

  it.each([
    ['camera-hit', 'onSelectCamera', 'onOpenCamera'],
    ['plug-hit', 'onTogglePlug', 'onOpenPlug'],
    ['shutter-hit', 'onToggleShutter', 'onOpenShutter'],
    ['emoji-hit', 'onToggleEmoji', 'onOpenEmoji'],
    ['decor-hit', 'onToggleDecor', 'onOpenDecor'],
    ['ac-hit', 'onToggleAc', 'onOpenAc'],
  ] as const)('%s : un OK choisit, un second OK ouvre sa page', (kind, first, second) => {
    const s = choose(setup([hit(kind, 'x', 500, 500, { clickable: 1 })]))
    expect(press('Enter').defaultPrevented).toBe(true)
    expect(s.handlers[first]).toHaveBeenCalledWith('x')
    expect(s.handlers[second]).not.toHaveBeenCalled()
    press('Enter')
    expect(s.handlers[second]).toHaveBeenCalledWith('x')
    s.detach()
  })

  it('une lampe : chaque OK l’allume ou l’éteint', () => {
    const s = choose(setup([hit('lamp-hit', 'l', 500, 500)]))
    press('Enter')
    press('Enter')
    expect(s.handlers.onToggleLamp).toHaveBeenCalledTimes(2)
    s.detach()
  })
})

describe('tvNav : Retour, zoom, débranchement', () => {
  it('Échap et Retour : plus rien n’est choisi, la Home est priée de se fermer', () => {
    const s = setup([hit('camera-hit', 'a', 500, 500)])
    press('ArrowRight')
    press('Enter')
    const pointer = vi.fn()
    document.addEventListener('pointerdown', pointer)
    expect(press('Escape').defaultPrevented).toBe(true)
    expect(s.handlers.onSelectCamera).toHaveBeenLastCalledWith('')
    expect(pointer).toHaveBeenCalledTimes(1)
    press('Backspace')
    expect(pointer).toHaveBeenCalledTimes(2)
    document.removeEventListener('pointerdown', pointer)
    s.detach()
  })

  it('l’application de la télé demande si Retour a quelque chose à fermer', () => {
    const s = setup([hit('camera-hit', 'a', 500, 500)])
    const hooks = window as unknown as { houseTvBack?: () => boolean; houseTvZoom?: (direction: number) => void }
    expect(hooks.houseTvBack?.()).toBe(false)
    press('ArrowRight')
    press('Enter')
    expect(hooks.houseTvBack?.()).toBe(true)
    expect(hooks.houseTvBack?.()).toBe(false)
    s.detach()
  })

  it('Programme + / − zooment ; le direct en grand suspend le zoom ; les autres touches non', () => {
    const s = setup([])
    const hooks = window as unknown as { houseTvZoom?: (direction: number) => void }
    expect(press('ChannelUp').defaultPrevented).toBe(true)
    expect(press('PageUp').defaultPrevented).toBe(true)
    expect(s.map.zoomIn).toHaveBeenCalledTimes(2)
    press('ChannelDown')
    hooks.houseTvZoom?.(-1)
    expect(s.map.zoomOut).toHaveBeenCalledTimes(2)
    expect(press('x').defaultPrevented).toBe(false)
    document.body.dataset.tvOverlay = '1'
    press('ChannelUp')
    expect(s.map.zoomIn).toHaveBeenCalledTimes(2)
    s.detach()
  })

  it('débrancher retire les écouteurs et les crochets', () => {
    const s = setup([hit('lamp-hit', 'a', 500, 500)])
    s.detach()
    const hooks = window as unknown as { houseTvBack?: unknown; houseTvZoom?: unknown }
    expect(hooks.houseTvBack).toBeUndefined()
    expect(hooks.houseTvZoom).toBeUndefined()
    expect(press('ArrowRight').defaultPrevented).toBe(false)
    press('ChannelUp')
    expect(s.map.zoomIn).not.toHaveBeenCalled()
  })
})
