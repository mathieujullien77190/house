import { act, fireEvent, render, screen } from '@testing-library/react'
import type { PlanCamera } from '@house/ui'
import MapPlan from './MapPlan'
import type { MapPlanProps } from './types'
import {
  BASES_LABEL,
  EDIT_LABEL,
  HIDE_ROOF_LABEL,
  LINK_LABEL,
  MAP_ROTATION_DEG,
  MAP_ZOOM,
  RECENTER_LABEL,
  SCREEN_ZOOM,
  SHOW_ROOF_LABEL,
} from './constants'

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
    fitBounds = vi.fn()
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
  NavigationControl: class {},
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
    expect(map.addControl).toHaveBeenCalled()
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
    expect(map.layers.has('vector')).toBe(false)
    expect(map.layers.has('plan-toit')).toBe(true)
    // le fond par défaut (satellite) est montré, les couches vectorielles cachées
    expect(map.visibility.get('fond-a')).toBe('none')
    expect(map.visibility.get('satellite')).toBe('visible')
    expect(map.sources.get('plan-formes')?.setData).toHaveBeenCalled()
    expect(map.sources.get('plan-points')?.setData).toHaveBeenCalled()
  })

  it('le fond vectoriel rend aux couches du style leur visibilité d’origine', () => {
    render(<MapPlan {...baseProps()} />)
    const map = loaded()
    fireEvent.click(screen.getByRole('tab', { name: 'Vectoriel' }))
    expect(map.visibility.get('fond-a')).toBe('visible')
    expect(map.visibility.get('fond-b')).toBe('none')
    expect(map.visibility.get('fond-c')).toBe('visible')
    expect(map.visibility.get('satellite')).toBe('none')
    expect(screen.getByRole('tablist', { name: BASES_LABEL })).toBeInTheDocument()
  })

  it('un fond en images dont la couche manque est sauté', () => {
    render(<MapPlan {...baseProps()} />)
    const map = loaded()
    map.layers.delete('satellite')
    map.visibility.clear()
    fireEvent.click(screen.getByRole('tab', { name: 'Vectoriel' }))
    expect(map.visibility.has('satellite')).toBe(false)
  })

  it('tant que le style n’est pas chargé, le choix du fond ne touche pas la carte', () => {
    render(<MapPlan {...baseProps()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Vectoriel' }))
    expect(lastMap().visibility.size).toBe(0)
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
    map.getStyle = () => {
      throw new Error('style cassé')
    }
    act(() => map.emit('style.load'))
    expect(screen.getByText('style cassé')).toBeInTheDocument()
    map.getStyle = () => {
      throw 'texte'
    }
    act(() => map.emit('style.load'))
    expect(screen.getByText('texte')).toBeInTheDocument()
  })

  it('« Recentrer » ramène la vue de départ', () => {
    render(<MapPlan {...baseProps()} />)
    fireEvent.click(screen.getByRole('button', { name: RECENTER_LABEL }))
    expect(lastMap().jumpTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: MAP_ZOOM, bearing: MAP_ROTATION_DEG, pitch: 0 }))
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
  it('« Cacher le toit » bascule le toit et les pièces, et le dit', () => {
    render(<MapPlan {...baseProps()} />)
    const map = loaded()
    const toggle = screen.getByRole('button', { name: HIDE_ROOF_LABEL })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(map.visibility.get('plan-toit')).toBe('visible')
    expect(map.visibility.get('plan-pieces')).toBe('none')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: SHOW_ROOF_LABEL })).toHaveAttribute('aria-pressed', 'true')
    expect(map.visibility.get('plan-toit')).toBe('none')
    for (const id of ['plan-pieces', 'plan-pieces-trait', 'plan-cloisons', 'plan-claustras']) expect(map.visibility.get(id)).toBe('visible')
    fireEvent.click(screen.getByRole('button', { name: SHOW_ROOF_LABEL }))
    expect(map.visibility.get('plan-toit')).toBe('visible')
    expect(map.visibility.get('plan-pieces')).toBe('none')
  })

  it('une couche absente est sautée ; rien avant le chargement du style', () => {
    render(<MapPlan {...baseProps()} />)
    fireEvent.click(screen.getByRole('button', { name: HIDE_ROOF_LABEL }))
    expect(lastMap().visibility.size).toBe(0)
    const map = loaded()
    map.layers.delete('plan-toit')
    map.layers.delete('plan-pieces')
    map.visibility.clear()
    fireEvent.click(screen.getByRole('button', { name: SHOW_ROOF_LABEL }))
    expect(map.visibility.has('plan-toit')).toBe(false)
    expect(map.visibility.has('plan-pieces')).toBe(false)
    expect(map.visibility.get('plan-cloisons')).toBe('none')
  })

  it('carte des lumières : le toit est caché au départ et son bouton n’existe pas', () => {
    render(<MapPlan {...baseProps({ mode: 'lights' })} />)
    const map = loaded()
    expect(screen.queryByRole('button', { name: SHOW_ROOF_LABEL })).toBeNull()
    expect(screen.queryByRole('button', { name: HIDE_ROOF_LABEL })).toBeNull()
    expect(map.visibility.get('plan-toit')).toBe('none')
    expect(map.visibility.get('plan-pieces')).toBe('visible')
  })
})

describe('MapPlan : cadrer les lampes', () => {
  it('carte des lumières : la vue cadre toutes les lampes, une seule fois', () => {
    const { rerender } = render(<MapPlan {...baseProps({ mode: 'lights', lamps: [] })} />)
    const map = loaded()
    expect(map.fitBounds).not.toHaveBeenCalled()
    rerender(<MapPlan {...baseProps({ mode: 'lights', lamps: [lamp('1'), lamp('2', { x: 200, y: 100 })] })} />)
    expect(map.fitBounds).toHaveBeenCalledTimes(1)
    expect(map.fitBounds.mock.calls[0][1]).toEqual(expect.objectContaining({ duration: 0 }))
    rerender(<MapPlan {...baseProps({ mode: 'lights', lamps: [lamp('1'), lamp('2', { x: 300, y: 100 })] })} />)
    expect(map.fitBounds).toHaveBeenCalledTimes(1)
  })

  it('« Recentrer » cadre les lampes sur la carte des lumières, et revient à la vue de départ sans lampes', () => {
    const { rerender } = render(<MapPlan {...baseProps({ mode: 'lights', lamps: [lamp('1')] })} />)
    const map = loaded()
    map.fitBounds.mockClear()
    fireEvent.click(screen.getByRole('button', { name: RECENTER_LABEL }))
    expect(map.fitBounds).toHaveBeenCalledTimes(1)
    expect(map.jumpTo).not.toHaveBeenCalled()
    rerender(<MapPlan {...baseProps({ mode: 'lights', lamps: [] })} />)
    fireEvent.click(screen.getByRole('button', { name: RECENTER_LABEL }))
    expect(map.jumpTo).toHaveBeenCalledTimes(1)
  })

  it('carte des caméras : pas de cadrage des lampes', () => {
    render(<MapPlan {...baseProps({ lamps: [lamp('26', { indoor: false })] })} />)
    expect(loaded().fitBounds).not.toHaveBeenCalled()
  })
})

describe('MapPlan : les lampes', () => {
  it('carte des caméras : les lampes d’intérieur ne se voient que toit caché, celle de la cage toujours', () => {
    const lamps = [lamp('1'), lamp('26', { indoor: false })]
    render(<MapPlan {...baseProps({ lamps })} />)
    const map = loaded()
    expect(pointKinds(map).filter((k) => k === 'lamp-hit')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: HIDE_ROOF_LABEL }))
    expect(pointKinds(map).filter((k) => k === 'lamp-hit')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: SHOW_ROOF_LABEL }))
    expect(pointKinds(map).filter((k) => k === 'lamp-hit')).toHaveLength(1)
  })

  it('une lampe à placer ne se voit qu’en modification', () => {
    const lamps = [lamp('1', { waiting: true }), lamp('2')]
    render(<MapPlan {...baseProps({ mode: 'lights', lamps })} />)
    const map = loaded()
    expect(pointKinds(map).filter((k) => k === 'lamp-hit')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: EDIT_LABEL }))
    expect(pointKinds(map).filter((k) => k === 'lamp-hit')).toHaveLength(2)
  })

  it('carte des lumières : ni caméras ni prise, même données ; les lampes seules', () => {
    const plugs = [{ id: 'p', name: 'p', x: 1, y: 1, on: true }]
    render(<MapPlan {...baseProps({ mode: 'lights', lamps: [lamp('1')], plugs })} />)
    const map = loaded()
    const kinds = shapeKinds(map)
    expect(kinds).toContain('lamp')
    expect(kinds).not.toContain('camera')
    expect(kinds).not.toContain('plug')
    expect(pointKinds(map)).toEqual(['lamp-hit'])
  })

  it('carte des caméras : caméras, prise et lampe de la cage', () => {
    const plugs = [{ id: 'p', name: 'p', x: 1, y: 1, on: true }]
    render(<MapPlan {...baseProps({ lamps: [lamp('26', { indoor: false })], plugs })} />)
    const kinds = shapeKinds(loaded())
    expect(kinds).toEqual(expect.arrayContaining(['camera', 'plug', 'lamp']))
  })

  it('sans lampes, caméras, prise, ni liens donnés : une carte vide mais valide', () => {
    render(<MapPlan trees={[]} hedges={[]} gates={[]} offsets={{}} cage={{ x: 0, y: 0, w: 10, h: 10 }} />)
    expect(shapeKinds(loaded())).not.toContain('camera')
  })

  it('en modification de la carte des lumières, seules les lampes se déplacent', () => {
    const onMoveLamp = vi.fn()
    const onMoveTree = vi.fn()
    const onMoveCamera = vi.fn()
    render(<MapPlan {...baseProps({ mode: 'lights', onMoveLamp, onMoveTree, onMoveCamera })} />)
    const context = editContext()
    // Sans modification : on peut toucher (basculer) une lampe, mais pas la déplacer.
    expect(context().onMoveLamp).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: EDIT_LABEL }))
    expect(context().onMoveLamp).toBe(onMoveLamp)
    expect(context().onMoveTree).toBeUndefined()
    expect(context().onMoveCamera).toBeUndefined()
  })

  it('en modification de la carte des caméras : tout se déplace, lampes comprises', () => {
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
    render(<MapPlan {...baseProps({ mode: 'lights', onToggleLamp })} />)
    expect(editContext()().onToggleLamp).toBe(onToggleLamp)
  })

  it('survoler une lampe écrit son nom et sa luminosité en bas ; la quitter l’efface', () => {
    render(<MapPlan {...baseProps({ mode: 'lights', lamps: [lamp('1', { name: 'Salon', brightness: 254 })] })} />)
    const context = editContext()
    expect(screen.queryByText(/Salon/)).toBeNull()
    act(() => context().onHoverLamp('1'))
    expect(screen.getByText('Salon · 100 %')).toBeInTheDocument()
    act(() => context().onHoverLamp(''))
    expect(screen.queryByText(/Salon/)).toBeNull()
  })

  it('une lampe éteinte ou injoignable est nommée sans pourcentage', () => {
    render(
      <MapPlan
        {...baseProps({
          mode: 'lights',
          lamps: [lamp('1', { name: 'Éteinte', on: false }), lamp('2', { name: 'Morte', reachable: false })],
        })}
      />,
    )
    const context = editContext()
    act(() => context().onHoverLamp('1'))
    expect(screen.getByText('Éteinte')).toBeInTheDocument()
    act(() => context().onHoverLamp('2'))
    expect(screen.getByText('Morte')).toBeInTheDocument()
  })
})

describe('MapPlan : l’écran du téléphone', () => {
  const portrait = (matches: boolean) => {
    const listeners = new Set<() => void>()
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('portrait') ? matches : false,
      media: query,
      addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
    }))
    return listeners
  }

  it('pas de boutons de zoom, zoom de départ de l’écran, flèche retour', () => {
    portrait(false)
    const onBack = vi.fn()
    render(<MapPlan {...baseProps({ mode: 'lights', screen: true, onBack, backLabel: 'Retour' })} />)
    const map = lastMap()
    expect(map.addControl).not.toHaveBeenCalled()
    expect(map.options).toMatchObject({ zoom: SCREEN_ZOOM, bearing: MAP_ROTATION_DEG })
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('sans fonction retour, pas de flèche', () => {
    portrait(false)
    render(<MapPlan {...baseProps({ screen: true })} />)
    expect(screen.queryByText('←')).toBeNull()
  })

  it('tenu droit, la carte est tournée d’un quart de tour de plus', () => {
    portrait(true)
    render(<MapPlan {...baseProps({ screen: true })} />)
    expect(lastMap().options).toMatchObject({ bearing: MAP_ROTATION_DEG + 90 })
    fireEvent.click(screen.getByRole('button', { name: RECENTER_LABEL }))
    expect(lastMap().jumpTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: SCREEN_ZOOM, bearing: MAP_ROTATION_DEG + 90 }))
  })

  it('le téléphone qu’on tourne : la carte suit ; démonté, l’écoute est retirée', () => {
    const listeners = portrait(true)
    const { unmount } = render(<MapPlan {...baseProps({ screen: true })} />)
    expect(listeners.size).toBe(1)
    const map = lastMap()
    listeners.forEach((fn) => fn())
    expect(map.easeTo).toHaveBeenCalledWith({ bearing: MAP_ROTATION_DEG + 90, duration: 300 })
    unmount()
    expect(listeners.size).toBe(0)
  })

  it('hors écran du téléphone, aucune écoute de l’orientation', () => {
    const listeners = portrait(true)
    render(<MapPlan {...baseProps()} />)
    expect(listeners.size).toBe(0)
  })
})
