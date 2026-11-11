import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { PlanCamera } from '@house/ui'
import MapPlan from './MapPlan'
import type { MapPlanProps } from './types'
import { EDIT_LABEL, LINK_LABEL, MAP_ROTATION_DEG, MAP_ZOOM } from './constants'

type Handler = (event?: unknown) => void

const mocks = vi.hoisted(() => {
  class FakeMap {
    static instances: FakeMap[] = []
    handlers = new Map<string, Handler>()
    sources = new Map<string, { setData: (data: unknown) => void }>()
    layers = new Map<string, unknown>()
    styleLayers: { id: string; layout?: { visibility?: string } }[] = [
      { id: 'fond-a' },
      { id: 'fond-b', layout: { visibility: 'none' } },
      { id: 'fond-c', layout: { visibility: 'visible' } },
    ]
    visibility = new Map<string, string>()
    removed = false
    touchZoomRotate = { disableRotation: vi.fn() }
    jumpTo = vi.fn()
    cameraForBounds = vi.fn((): { center: [number, number]; zoom: number } | undefined => ({ center: [2.65, 48.52], zoom: 20.2 }))
    easeTo = vi.fn()
    addControl = vi.fn()
    options: unknown
    constructor(options: unknown) {
      this.options = options
      FakeMap.instances.push(this)
    }
    on(type: string, fn: Handler) {
      this.handlers.set(type, fn)
    }
    off() {}
    resize = vi.fn()
    project() {
      return { x: 100, y: 200 }
    }
    unproject([x, y]: [number, number]) {
      return { lng: 2 + x / 1000, lat: 48 + y / 1000 }
    }
    getStyle() {
      return { layers: this.styleLayers }
    }
    addSource(id: string) {
      this.sources.set(id, { setData: vi.fn() })
    }
    addLayer(layer: { id: string }) {
      this.layers.set(layer.id, layer)
    }
    getLayer(id: string) {
      return this.layers.get(id)
    }
    getSource(id: string) {
      return this.sources.get(id)
    }
    setLayoutProperty(id: string, _name: string, value: string) {
      this.visibility.set(id, value)
    }
    getCenter() {
      return { lat: 48.522045, lng: 2.650143 }
    }
    getZoom() {
      return 19.85
    }
    getBearing() {
      return 37.7
    }
    filters = new Map<string, unknown>()
    setFilter(id: string, filter: unknown) {
      this.filters.set(id, filter)
    }
    getCanvas() {
      return { style: { cursor: '' } }
    }
    remove() {
      this.removed = true
    }
    emit(type: string, event?: unknown) {
      this.handlers.get(type)?.(event)
    }
  }
  return { FakeMap, workerUrls: [] as string[], editing: vi.fn(() => vi.fn()) }
})

vi.mock('maplibre-gl', () => ({
  Map: mocks.FakeMap,
  setWorkerUrl: (url: string) => mocks.workerUrls.push(url),
}))
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?url', () => ({ default: '/worker.mjs' }))
vi.mock('./edit', () => ({ attachEditing: mocks.editing }))

const cameras: PlanCamera[] = [{ id: 'c1', name: 'c', x: 10, y: 10, angle: 0, fov: 60, near: 5, far: 100 }]

const baseProps = (over: Partial<MapPlanProps> = {}): MapPlanProps => ({
  cameras,
  trees: [],
  hedges: [],
  gates: [],
  lamps: [],
  plugs: [],
  offsets: {},
  cage: { x: 0, y: 0, w: 10, h: 10 },
  selectedCameraId: '',
  selectedTreeId: '',
  selectedHedgeId: '',
  cameraNames: ['voliere-interieur', 'voliere-exterieur'],
  links: {},
  ...over,
})

const lastMap = () => mocks.FakeMap.instances[mocks.FakeMap.instances.length - 1]

beforeEach(() => {
  mocks.FakeMap.instances.length = 0
  mocks.editing.mockClear()
})

const loaded = () => {
  act(() => lastMap().emit('style.load'))
  return lastMap()
}

describe('MapPlan', () => {
  it('crée la carte tournée sur la maison et branche l’édition', () => {
    render(<MapPlan {...baseProps()} />)
    const map = lastMap()
    expect(map.options).toMatchObject({ bearing: MAP_ROTATION_DEG, zoom: MAP_ZOOM, pitch: 0 })
    expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled()
    expect(map.addControl).not.toHaveBeenCalled()
    expect(mocks.editing).toHaveBeenCalled()
    expect(mocks.workerUrls).toEqual(['/worker.mjs'])
  })

  it('démonter débranche l’édition et supprime la carte', () => {
    const detach = vi.fn()
    mocks.editing.mockReturnValueOnce(detach)
    const { unmount } = render(<MapPlan {...baseProps()} />)
    const map = lastMap()
    unmount()
    expect(detach).toHaveBeenCalled()
    expect(map.removed).toBe(true)
  })

  it('au chargement du style : fonds en images, couches du plan, données', () => {
    render(<MapPlan {...baseProps()} />)
    const map = loaded()
    expect(map.layers.has('satellite')).toBe(true)
    expect(map.layers.has('plan-toit')).toBe(true)
    // le style de départ est vide : la photo aérienne est le seul fond
    expect(map.options).toEqual(expect.objectContaining({ style: { version: 8, sources: {}, layers: [] } }))
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByText(/zoom/)).toBeNull()
    expect(map.sources.get('plan-formes')?.setData).toHaveBeenCalled()
    expect(map.sources.get('plan-points')?.setData).toHaveBeenCalled()
  })

  it('les éléments changés mettent à jour les données (source absente tolérée)', () => {
    const { rerender } = render(<MapPlan {...baseProps()} />)
    const map = loaded()
    const shapes = map.sources.get('plan-formes')?.setData as ReturnType<typeof vi.fn>
    shapes.mockClear()
    rerender(<MapPlan {...baseProps({ selectedCameraId: 'c1' })} />)
    expect(shapes).toHaveBeenCalled()
    map.sources.clear()
    rerender(<MapPlan {...baseProps({ selectedCameraId: '' })} />)
  })

  it('affiche l’erreur de la carte, avec un texte par défaut', () => {
    render(<MapPlan {...baseProps()} />)
    act(() => lastMap().emit('error', { error: { message: 'tuiles' } }))
    expect(screen.getByText('tuiles')).toBeInTheDocument()
    act(() => lastMap().emit('error', {}))
    expect(screen.getByText('Erreur de la carte')).toBeInTheDocument()
  })

  it('une erreur pendant le chargement du style est affichée (Error ou autre)', () => {
    render(<MapPlan {...baseProps()} />)
    const map = lastMap()
    map.addSource = () => {
      throw new Error('style cassé')
    }
    act(() => map.emit('style.load'))
    expect(screen.getByText('style cassé')).toBeInTheDocument()
    map.addSource = () => {
      throw 'texte'
    }
    act(() => map.emit('style.load'))
    expect(screen.getByText('texte')).toBeInTheDocument()
  })

  it('« Modifier » donne ou retire les moyens de modification', () => {
    const onMoveCamera = vi.fn()
    render(<MapPlan {...baseProps({ onMoveCamera })} />)
    const context = (mocks.editing.mock.calls as unknown as [unknown, () => { onMoveCamera?: unknown }][])[0][1]
    expect(context().onMoveCamera).toBeUndefined()
    const toggle = screen.getByRole('button', { name: EDIT_LABEL })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(context().onMoveCamera).toBe(onMoveCamera)
    fireEvent.click(toggle)
    expect(context().onMoveCamera).toBeUndefined()
  })

  it('« Caméra liée » : seulement en modification, avec une caméra choisie ; change le lien', () => {
    const onLink = vi.fn()
    const { rerender } = render(<MapPlan {...baseProps({ onLink, selectedCameraId: 'c1', links: { c1: 'voliere-interieur' } })} />)
    // lecture seule : pas de liste
    expect(screen.queryByRole('combobox', { name: LINK_LABEL })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: EDIT_LABEL }))
    expect(screen.getByRole('combobox', { name: LINK_LABEL })).toHaveTextContent('voliere-interieur')
    fireEvent.click(screen.getByRole('combobox', { name: LINK_LABEL }))
    fireEvent.click(screen.getByRole('option', { name: 'voliere-exterieur' }))
    expect(onLink).toHaveBeenCalledWith('c1', 'voliere-exterieur')
    // sans lien connu : « Aucune »
    rerender(<MapPlan {...baseProps({ onLink, selectedCameraId: 'c1', links: {} })} />)
    expect(screen.getByRole('combobox', { name: LINK_LABEL })).toHaveTextContent('Aucune')
    // pas de caméra choisie : pas de liste
    rerender(<MapPlan {...baseProps({ onLink, selectedCameraId: '' })} />)
    expect(screen.queryByRole('combobox', { name: LINK_LABEL })).toBeNull()
  })
})

/* eslint-disable @typescript-eslint/no-explicit-any -- le contexte d'édition et les données de la carte sont inspectés librement */
type Context = Record<string, any>
const editContext = (): (() => Context) => (mocks.editing.mock.calls as unknown as [unknown, () => Context][])[0][1]
const shapeKinds = (map: ReturnType<typeof lastMap>): string[] => {
  const calls = (map.sources.get('plan-formes')?.setData as ReturnType<typeof vi.fn>).mock.calls
  const last = calls[calls.length - 1][0] as { features: { properties: { kind: string } }[] }
  return last.features.map((f) => f.properties.kind)
}
const pointKinds = (map: ReturnType<typeof lastMap>): string[] => {
  const calls = (map.sources.get('plan-points')?.setData as ReturnType<typeof vi.fn>).mock.calls
  const last = calls[calls.length - 1][0] as { features: { properties: { kind: string } }[] }
  return last.features.map((f) => f.properties.kind)
}

const lamp = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Lampe ${id}`,
  x: 10,
  y: 10,
  on: true,
  reachable: true,
  brightness: 127,
  indoor: true,
  ...over,
})

describe('MapPlan : le toit', () => {
  it('le toit est caché et les pièces se voient, sans bouton', () => {
    render(<MapPlan {...baseProps()} />)
    const map = loaded()
    expect(screen.queryByRole('button', { name: /toit/i })).toBeNull()
    expect(map.visibility.get('plan-toit')).toBe('none')
    for (const id of ['plan-pieces', 'plan-cloisons', 'plan-claustras']) expect(map.visibility.get(id)).toBe('visible')
  })

  it('rien avant le chargement du style', () => {
    render(<MapPlan {...baseProps()} />)
    expect(lastMap().visibility.size).toBe(0)
  })
})

describe('MapPlan : les cases Clim, Caméra, Lumière, Volet', () => {
  it('toutes cochées au départ ; décocher cache les calques du type et retire sa zone de saisie', () => {
    render(<MapPlan {...baseProps()} />)
    const map = loaded()
    for (const name of ['Clim', 'Caméra', 'Lumière', 'Volet', 'Chauffage']) expect(screen.getByRole('checkbox', { name })).toBeChecked()
    // Les emoji des clips sont cachés au départ ; les cocher les montre et leur rend leur zone de saisie.
    expect(screen.getByRole('checkbox', { name: 'Clip' })).not.toBeChecked()
    expect(map.visibility.get('plan-emojis')).toBe('none')
    expect(JSON.stringify(map.filters.get('plan-saisie'))).not.toContain('emoji-hit')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Clip' }))
    expect(map.visibility.get('plan-emojis')).toBe('visible')
    expect(JSON.stringify(map.filters.get('plan-saisie'))).toContain('emoji-hit')
    for (const id of ['plan-clims', 'plan-clims-etat', 'plan-cameras', 'plan-vue', 'plan-lampes', 'plan-volets'])
      expect(map.visibility.get(id)).toBe('visible')
    expect(JSON.stringify(map.filters.get('plan-saisie'))).toContain('camera-hit')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Caméra' }))
    for (const id of ['plan-cameras', 'plan-cameras-etat', 'plan-vue']) expect(map.visibility.get(id)).toBe('none')
    expect(map.visibility.get('plan-lampes')).toBe('visible')
    const kinds = JSON.stringify(map.filters.get('plan-saisie'))
    expect(kinds).not.toContain('camera-hit')
    expect(kinds).toContain('lamp-hit')
    expect(kinds).toContain('label-hit')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chauffage' }))
    expect(map.visibility.get('plan-prises')).toBe('none')
    expect(map.visibility.get('plan-prises-etat')).toBe('none')
    expect(JSON.stringify(map.filters.get('plan-saisie'))).not.toContain('plug-hit')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Caméra' }))
    expect(map.visibility.get('plan-cameras')).toBe('visible')
  })
})

describe('MapPlan : les lampes', () => {
  it('toutes les lampes se voient, celles d’intérieur comme celle de la cage', () => {
    const lamps = [lamp('1'), lamp('26', { indoor: false })]
    render(<MapPlan {...baseProps({ lamps })} />)
    expect(pointKinds(loaded()).filter((k) => k === 'lamp-hit')).toHaveLength(2)
  })

  it('caméras, prise et lampes se dessinent ensemble', () => {
    const plugs = [{ id: 'p', name: 'p', x: 1, y: 1, on: true }]
    render(<MapPlan {...baseProps({ lamps: [lamp('26', { indoor: false })], plugs })} />)
    const map = loaded()
    expect(pointKinds(map)).toEqual(expect.arrayContaining(['camera-hit', 'lamp-hit', 'plug-hit']))
  })

  it('sans lampes, caméras, prise, ni liens donnés : une carte vide mais valide', () => {
    render(<MapPlan trees={[]} hedges={[]} gates={[]} offsets={{}} cage={{ x: 0, y: 0, w: 10, h: 10 }} />)
    expect(shapeKinds(loaded())).not.toContain('camera')
  })

  it('en modification : tout se déplace, lampes comprises', () => {
    const onMoveLamp = vi.fn()
    const onMoveTree = vi.fn()
    render(<MapPlan {...baseProps({ onMoveLamp, onMoveTree })} />)
    const context = editContext()
    expect(context().onMoveLamp).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: EDIT_LABEL }))
    expect(context().onMoveLamp).toBe(onMoveLamp)
    expect(context().onMoveTree).toBe(onMoveTree)
  })

  it('hors modification, toucher une lampe reste possible (onToggleLamp conservé)', () => {
    const onToggleLamp = vi.fn()
    render(<MapPlan {...baseProps({ onToggleLamp })} />)
    expect(editContext()().onToggleLamp).toBe(onToggleLamp)
  })

  it('survoler une lampe écrit son nom et sa luminosité en bas ; la quitter l’efface', () => {
    render(<MapPlan {...baseProps({ lamps: [lamp('1', { name: 'Salon', brightness: 254 })] })} />)
    const context = editContext()
    expect(screen.queryByText(/Salon/)).toBeNull()
    act(() => context().onHoverLamp('1'))
    expect(screen.getByText('Salon · 100 %')).toBeInTheDocument()
    act(() => context().onHoverLamp(''))
    expect(screen.queryByText(/Salon/)).toBeNull()
  })

  const iconCameras = [{ id: 'cam-a', name: 'Icône A', x: 0, y: 0, angle: 0, fov: 60, near: 1, far: 10 }]

  it('survoler une caméra liée écrit le nom de la vraie caméra ; la quitter l’efface', () => {
    render(<MapPlan {...baseProps({ cameras: iconCameras, links: { 'cam-a': 'voliere-interieur' } })} />)
    act(() => editContext()().onHoverCamera('cam-a'))
    expect(screen.getByText('voliere-interieur')).toBeInTheDocument()
    act(() => editContext()().onHoverCamera(''))
    expect(screen.queryByText('voliere-interieur')).toBeNull()
  })

  it('survoler une caméra non liée écrit le nom de son icône ; une caméra inconnue n’écrit rien', () => {
    render(<MapPlan {...baseProps({ cameras: iconCameras })} />)
    act(() => editContext()().onHoverCamera('cam-a'))
    expect(screen.getByText('Icône A')).toBeInTheDocument()
    act(() => editContext()().onHoverCamera('absente'))
    expect(screen.queryByText('Icône A')).toBeNull()
  })

  it('survoler le chauffage écrit son nom ; la quitter l’efface', () => {
    render(<MapPlan {...baseProps({ plugs: [{ id: 'prise', name: 'Chauffage volière', x: 0, y: 0, on: true }] })} />)
    act(() => editContext()().onHoverPlug('prise'))
    expect(screen.getByText('Chauffage volière')).toBeInTheDocument()
    act(() => editContext()().onHoverPlug(''))
    expect(screen.queryByText('Chauffage volière')).toBeNull()
  })

  it('une lampe éteinte ou injoignable est nommée sans pourcentage', () => {
    render(
      <MapPlan {...baseProps({ lamps: [lamp('1', { name: 'Éteinte', on: false }), lamp('2', { name: 'Morte', reachable: false })] })} />,
    )
    const context = editContext()
    act(() => context().onHoverLamp('1'))
    expect(screen.getByText('Éteinte')).toBeInTheDocument()
    act(() => context().onHoverLamp('2'))
    expect(screen.getByText('Morte')).toBeInTheDocument()
  })
})

describe('MapPlan : la ligne de l’objet choisi à son bloc', () => {
  const box = { left: 400, top: 10, height: 300 }
  const lineOf = (map: ReturnType<typeof loaded>) => {
    const calls = (map.sources.get('plan-lien')?.setData as ReturnType<typeof vi.fn>).mock.calls
    return calls.at(-1)?.[0] as { features: { geometry: { coordinates: number[][] } }[] }
  }

  it('une ligne part de l’icône choisie vers le bord gauche du bloc, à la hauteur de l’icône quand elle tombe en face du bloc', () => {
    render(<MapPlan {...baseProps({ selectedCameraId: 'c1', linkBox: box })} />)
    const map = loaded()
    const line = lineOf(map)
    expect(line.features).toHaveLength(1)
    const [from, to] = line.features[0].geometry.coordinates
    expect(from).toHaveLength(2)
    // le bout est le bord gauche du bloc (400) à la hauteur de l'icône (200, dans le bloc)
    expect(to).toEqual([2 + 400 / 1000, 48 + 200 / 1000])
    // la carte bouge : la ligne est recalculée
    ;(map.sources.get('plan-lien')?.setData as ReturnType<typeof vi.fn>).mockClear()
    act(() => map.emit('move'))
    expect(lineOf(map).features).toHaveLength(1)
  })

  it('l’icône au-dessus ou au-dessous du bloc : la ligne rejoint son bord le plus proche', () => {
    const { unmount } = render(<MapPlan {...baseProps({ selectedCameraId: 'c1', linkBox: { left: 400, top: 250, height: 100 } })} />)
    expect(lineOf(loaded()).features[0].geometry.coordinates[1]).toEqual([2.4, 48.25])
    unmount()
    render(<MapPlan {...baseProps({ selectedCameraId: 'c1', linkBox: { left: 400, top: 10, height: 100 } })} />)
    expect(lineOf(loaded()).features[0].geometry.coordinates[1]).toEqual([2.4, 48.11])
  })

  it('sans bloc ou sans objet choisi : aucune ligne', () => {
    render(<MapPlan {...baseProps({ selectedCameraId: 'c1' })} />)
    expect(lineOf(loaded()).features).toHaveLength(0)
    cleanup()
    render(<MapPlan {...baseProps({ linkBox: box })} />)
    expect(lineOf(loaded()).features).toHaveLength(0)
  })
})

describe('MapPlan : sur téléphone', () => {
  it('le bouton « Modifier » n’existe pas quand la carte remplit l’écran (téléphone) ; il existe sinon', () => {
    const { unmount } = render(<MapPlan {...baseProps({ fill: true })} />)
    expect(screen.queryByRole('button', { name: EDIT_LABEL })).toBeNull()
    // les cases à cocher restent
    expect(screen.getByRole('checkbox', { name: 'Clim' })).toBeInTheDocument()
    unmount()
    render(<MapPlan {...baseProps()} />)
    expect(screen.getByRole('button', { name: EDIT_LABEL })).toBeInTheDocument()
  })
})

describe('MapPlan : la carte suit la taille de son cadre', () => {
  it('quand le cadre change de taille (la Home cachée redevient visible), la carte se redimensionne', () => {
    const callbacks: (() => void)[] = []
    const original = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        callbacks.push(callback)
      }
      observe() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    try {
      const { unmount } = render(<MapPlan {...baseProps()} />)
      const map = lastMap()
      expect(callbacks).toHaveLength(1)
      callbacks[0]()
      expect((map as unknown as { resize: ReturnType<typeof vi.fn> }).resize).toHaveBeenCalledTimes(1)
      unmount()
    } finally {
      globalThis.ResizeObserver = original
    }
  })
})

describe('MapPlan : vue imposée et ancre de l’objet choisi', () => {
  it('la vue imposée par le parent est appliquée d’un coup', () => {
    render(<MapPlan {...baseProps({ focusView: { lat: 48.5, lng: 2.6, zoom: 21, bearing: 10 } })} />)
    expect(lastMap().jumpTo).toHaveBeenCalledWith({ center: [2.6, 48.5], zoom: 21, bearing: 10, pitch: 0 })
  })

  const ac = { id: 'a1', name: 'Clim', x: 5, y: 5, on: true, reachable: true, label: 'Clim · chaud' }
  const shutter = { id: 's1', name: 'Volet', x: 6, y: 6, closed: false, label: 'Volet cuisine' }
  const emoji = { id: 'e1', emoji: '🦊', x: 7, y: 7 }
  const plug = { id: 'p1', name: 'Chauffage', x: 8, y: 8, on: true }

  it.each([
    ['la prise', { plugs: [plug], selectedPlugId: 'p1' }],
    ['la clim', { acs: [ac], selectedAcId: 'a1' }],
    ['le volet', { shutters: [shutter], selectedShutterId: 's1' }],
    ['l’emoji', { emojis: [emoji], selectedEmojiId: 'e1' }],
  ] as [string, Partial<MapPlanProps>][])('donne au parent la place à l’écran de %s, relue quand la carte bouge', (_name, over) => {
    const onAnchor = vi.fn()
    const { unmount } = render(<MapPlan {...baseProps({ ...over, onAnchor })} />)
    const map = loaded()
    expect(onAnchor).toHaveBeenLastCalledWith({ x: 100, y: 200 })
    onAnchor.mockClear()
    act(() => map.emit('move'))
    expect(onAnchor).toHaveBeenCalledWith({ x: 100, y: 200 })
    unmount()
  })

  it('rien de choisi : le parent reçoit null', () => {
    const onAnchor = vi.fn()
    render(<MapPlan {...baseProps({ onAnchor })} />)
    loaded()
    expect(onAnchor).toHaveBeenLastCalledWith(null)
  })
})

describe('MapPlan : textes de la clim et du volet, et clics selon le mode', () => {
  it('survoler une clim ou un volet écrit son texte ; les quitter l’efface', () => {
    render(
      <MapPlan
        {...baseProps({
          acs: [{ id: 'a1', name: 'Clim', x: 5, y: 5, on: true, reachable: true, label: 'Clim · chaud' }],
          shutters: [{ id: 's1', name: 'Volet', x: 6, y: 6, closed: true, label: 'Volet cuisine · Descendre' }],
        })}
      />,
    )
    const context = editContext()
    act(() => context().onHoverAc('a1'))
    act(() => context().onHoverShutter('s1'))
    expect(screen.getByText('Clim · chaud')).toBeInTheDocument()
    expect(screen.getByText('Volet cuisine · Descendre')).toBeInTheDocument()
    act(() => context().onHoverAc(''))
    act(() => context().onHoverShutter(''))
    expect(screen.queryByText('Clim · chaud')).toBeNull()
    expect(screen.queryByText('Volet cuisine · Descendre')).toBeNull()
  })

  it('clim : un clic ouvre la page sans onSelectAc ; avec, il choisit et le double clic ouvre ; en modification, rien', () => {
    const onOpenAc = vi.fn()
    const onSelectAc = vi.fn()
    const { rerender } = render(<MapPlan {...baseProps({ onOpenAc })} />)
    expect(editContext()().onToggleAc).toBe(onOpenAc)
    expect(editContext()().onOpenAc).toBeUndefined()
    rerender(<MapPlan {...baseProps({ onOpenAc, onSelectAc })} />)
    expect(editContext()().onToggleAc).toBe(onSelectAc)
    expect(editContext()().onOpenAc).toBe(onOpenAc)
    fireEvent.click(screen.getByRole('button', { name: EDIT_LABEL }))
    expect(editContext()().onToggleAc).toBeUndefined()
    expect(editContext()().onOpenAc).toBeUndefined()
  })

  it('volet : sans onSelectShutter un clic donne l’ordre ; avec, il choisit et le double clic ouvre ; en modification, rien', () => {
    const onToggleShutter = vi.fn()
    const onSelectShutter = vi.fn()
    const onOpenShutter = vi.fn()
    const { rerender } = render(<MapPlan {...baseProps({ onToggleShutter, onOpenShutter })} />)
    expect(editContext()().onToggleShutter).toBe(onToggleShutter)
    expect(editContext()().onOpenShutter).toBeUndefined()
    rerender(<MapPlan {...baseProps({ onToggleShutter, onSelectShutter, onOpenShutter })} />)
    expect(editContext()().onToggleShutter).toBe(onSelectShutter)
    expect(editContext()().onOpenShutter).toBe(onOpenShutter)
    fireEvent.click(screen.getByRole('button', { name: EDIT_LABEL }))
    expect(editContext()().onToggleShutter).toBeUndefined()
    expect(editContext()().onOpenShutter).toBeUndefined()
  })
})

describe('MapPlan : navigateur sans ResizeObserver', () => {
  it('la carte se monte sans suivre la taille de son cadre', () => {
    const original = globalThis.ResizeObserver
    // @ts-expect-error -- on retire l'API pour simuler un navigateur qui ne l'a pas
    delete globalThis.ResizeObserver
    try {
      render(<MapPlan {...baseProps()} />)
      expect(lastMap()).toBeDefined()
    } finally {
      globalThis.ResizeObserver = original
    }
  })
})
