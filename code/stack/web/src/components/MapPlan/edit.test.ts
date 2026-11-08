import type { PlanCamera, PlanHedge, PlanTree } from '@house/ui'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { attachEditing, type EditContext } from './edit'

// Le plan et la carte se confondent : la saisie se teste en unités du plan, sans arrondis de projection.
vi.mock('./projection', () => ({ lngLatToPlan: (lng: number, lat: number) => [lng, lat] }))

type Handler = (event: unknown) => void

interface Hit {
  layer: string
  properties: Record<string, unknown>
}

/** Une carte factice : garde les gestionnaires, rend les éléments « sous la souris » qu'on lui donne. */
const fakeMap = () => {
  const handlers = new Map<string, Handler>()
  const canvas = { style: { cursor: '' } }
  const state = { hits: [] as Hit[], layers: true }
  const map = {
    on: vi.fn((type: string, fn: Handler) => handlers.set(type, fn)),
    off: vi.fn((type: string) => handlers.delete(type)),
    getCanvas: () => canvas,
    getLayer: () => state.layers,
    queryRenderedFeatures: vi.fn(() => state.hits.map((hit) => ({ layer: { id: hit.layer }, properties: hit.properties }))),
  }
  return { map: map as unknown as MapLibreMap, raw: map, handlers, canvas, state }
}

const at = (x: number, y: number) => ({ lng: x, lat: y })
const mouse = (px: number, py: number, plan = { x: 0, y: 0 }) => ({
  point: { x: px, y: py },
  lngLat: at(plan.x, plan.y),
  preventDefault: vi.fn(),
})

const cam: PlanCamera = { id: 'c1', name: 'c', x: 100, y: 100, angle: 0, fov: 60, near: 10, far: 200 }
const tree: PlanTree = { id: 't1', x: 50, y: 50, r: 20 }
const hedge: PlanHedge = {
  id: 'h1',
  points: [
    [0, 0],
    [10, 10],
    [20, 20],
  ],
}

const context = (over: Partial<EditContext> = {}): EditContext => ({
  cameras: [cam],
  trees: [tree],
  hedges: [hedge],
  offsets: { garage: { dx: 5, dy: 6 } },
  cage: { x: 10, y: 20, w: 100, h: 100 },
  onMoveCamera: vi.fn(),
  onAdjustCamera: vi.fn(),
  onSelectCamera: vi.fn(),
  onMoveTree: vi.fn(),
  onResizeTree: vi.fn(),
  onSelectTree: vi.fn(),
  onMoveHedge: vi.fn(),
  onSelectHedge: vi.fn(),
  onMoveOffset: vi.fn(),
  onMoveCage: vi.fn(),
  onMoveLamp: vi.fn(),
  onToggleLamp: vi.fn(),
  onHoverLamp: vi.fn(),
  onMovePlug: vi.fn(),
  ...over,
})

const setup = (over: Partial<EditContext> = {}) => {
  const fake = fakeMap()
  const ctx = context(over)
  const detach = attachEditing(fake.map, () => ctx)
  const fire = (type: string, event: unknown = {}) => fake.handlers.get(type)?.(event)
  /** Saisit un élément de ce genre, puis le déplace au point du plan donné. */
  const drag = (hit: Hit, plan: { x: number; y: number }, start = { x: 0, y: 0 }) => {
    fake.state.hits = [hit]
    fire('mousedown', mouse(10, 10, start))
    fire('mousemove', mouse(100, 100, plan))
  }
  return { ...fake, ctx, detach, fire, drag }
}

describe('attachEditing', () => {
  it('branche et débranche tous les gestionnaires', () => {
    const { raw, detach, handlers } = setup()
    expect([...handlers.keys()].sort()).toEqual([
      'click',
      'mousedown',
      'mousemove',
      'mouseup',
      'touchcancel',
      'touchend',
      'touchmove',
      'touchstart',
    ])
    detach()
    expect(raw.off).toHaveBeenCalledTimes(8)
    expect(handlers.size).toBe(0)
  })

  describe('saisie', () => {
    it('ignore un geste à plusieurs doigts et un clic dans le vide', () => {
      const { fire, canvas, state } = setup()
      fire('touchstart', { ...mouse(1, 1), points: [1, 2] })
      expect(canvas.style.cursor).toBe('')
      state.hits = []
      fire('mousedown', mouse(1, 1))
      expect(canvas.style.cursor).toBe('')
    })
    it('un seul doigt saisit', () => {
      const { fire, canvas, state } = setup()
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } }]
      fire('touchstart', { ...mouse(1, 1), points: [1] })
      expect(canvas.style.cursor).toBe('grabbing')
    })
    it('prend l’élément de la couche la plus prioritaire', () => {
      const { fire, state, ctx } = setup()
      state.hits = [
        { layer: 'plan-cage', properties: { kind: 'cage', id: 'cage' } },
        { layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } },
      ]
      fire('mousedown', mouse(1, 1))
      fire('mouseup')
      expect(ctx.onSelectCamera).toHaveBeenCalledWith('c1')
    })
    it('un arbre saisi est choisi, même sans pouvoir le déplacer', () => {
      const { fire, state, ctx } = setup({ onMoveTree: undefined })
      state.hits = [{ layer: 'plan-arbres', properties: { kind: 'tree', id: 't1' } }]
      fire('mousedown', mouse(1, 1))
      expect(ctx.onSelectTree).toHaveBeenCalledWith('t1')
    })
    it('sans rappel pour ce genre, rien n’est saisi (sauf une caméra, qu’on peut choisir)', () => {
      const { fire, state, canvas } = setup({ onMoveLamp: undefined, onToggleLamp: undefined, onMoveCamera: undefined })
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l' } }]
      fire('mousedown', mouse(1, 1))
      expect(canvas.style.cursor).toBe('')
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } }]
      fire('mousedown', mouse(1, 1))
      expect(canvas.style.cursor).toBe('grabbing')
    })
    it('ne demande à la carte que les couches qui existent', () => {
      const { fire, state, raw } = setup()
      state.layers = false
      fire('mousedown', mouse(1, 1))
      expect((raw.queryRenderedFeatures.mock.calls as unknown as [unknown, { layers: string[] }][])[0][1].layers).toEqual([])
    })
  })

  describe('survol', () => {
    it('à la souris : main ouverte sur un élément, sinon rien ; au doigt : rien', () => {
      const { fire, state, canvas } = setup()
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l' } }]
      fire('mousemove', mouse(1, 1))
      expect(canvas.style.cursor).toBe('grab')
      state.hits = []
      fire('mousemove', mouse(1, 1))
      expect(canvas.style.cursor).toBe('')
      canvas.style.cursor = 'x'
      fire('touchmove', { ...mouse(1, 1), points: [1] })
      expect(canvas.style.cursor).toBe('x')
    })
    it('une lampe qu’on peut déplacer : main ouverte ; son nom est annoncé, puis effacé en la quittant', () => {
      const { fire, state, canvas, ctx } = setup()
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l' } }]
      fire('mousemove', mouse(1, 1))
      expect(canvas.style.cursor).toBe('grab')
      expect(ctx.onHoverLamp).toHaveBeenLastCalledWith('l')
      state.hits = []
      fire('mousemove', mouse(1, 1))
      expect(ctx.onHoverLamp).toHaveBeenLastCalledWith('')
    })
    it('une lampe qu’on ne peut que toucher : curseur « main »', () => {
      const { fire, state, canvas } = setup({ onMoveLamp: undefined })
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l' } }]
      fire('mousemove', mouse(1, 1))
      expect(canvas.style.cursor).toBe('pointer')
    })
    it('un autre élément ne s’annonce pas comme une lampe', () => {
      const { fire, state, canvas, ctx } = setup()
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } }]
      fire('mousemove', mouse(1, 1))
      expect(canvas.style.cursor).toBe('grab')
      expect(ctx.onHoverLamp).toHaveBeenLastCalledWith('')
    })
    it('sans rappel de survol, rien ne casse', () => {
      const { fire, state } = setup({ onHoverLamp: undefined })
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l' } }]
      expect(() => fire('mousemove', mouse(1, 1))).not.toThrow()
    })
  })

  describe('lampes', () => {
    const hit = { layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l1' } }
    it('un toucher (sans glisser) allume ou éteint, et annonce le nom', () => {
      const { fire, state, ctx } = setup()
      state.hits = [hit]
      fire('mousedown', mouse(10, 10))
      fire('mouseup')
      expect(ctx.onToggleLamp).toHaveBeenCalledWith('l1')
      expect(ctx.onHoverLamp).toHaveBeenLastCalledWith('l1')
      expect(ctx.onMoveLamp).not.toHaveBeenCalled()
    })
    it('un glissement déplace la lampe sans l’allumer', () => {
      const { drag, fire, ctx } = setup()
      drag(hit, { x: 30, y: 40 })
      fire('mouseup')
      expect(ctx.onMoveLamp).toHaveBeenCalledWith('l1', 30, 40)
      expect(ctx.onToggleLamp).not.toHaveBeenCalled()
    })
    it('hors modification (pas de déplacement) : toucher bascule, glisser ne fait rien', () => {
      const { drag, fire, state, ctx } = setup({ onMoveLamp: undefined })
      drag(hit, { x: 30, y: 40 })
      fire('mouseup')
      expect(ctx.onToggleLamp).not.toHaveBeenCalled()
      state.hits = [hit]
      fire('mousedown', mouse(10, 10))
      fire('mouseup')
      expect(ctx.onToggleLamp).toHaveBeenCalledWith('l1')
    })
    it('sans rappel de basculement ni de survol : un toucher ne casse rien', () => {
      const { fire, state } = setup({ onToggleLamp: undefined, onHoverLamp: undefined })
      state.hits = [hit]
      fire('mousedown', mouse(10, 10))
      expect(() => fire('mouseup')).not.toThrow()
    })
    it('cliquer à côté efface le nom annoncé', () => {
      const { fire, state, ctx } = setup()
      state.hits = []
      fire('click', mouse(1, 1))
      expect(ctx.onHoverLamp).toHaveBeenCalledWith('')
    })
    it('relâcher la cage sans la bouger ne choisit rien', () => {
      const { fire, state, ctx } = setup()
      state.hits = [{ layer: 'plan-cage', properties: { kind: 'cage', id: 'cage' } }]
      fire('mousedown', mouse(1, 1))
      fire('mouseup')
      expect(ctx.onSelectCamera).not.toHaveBeenCalled()
      expect(ctx.onToggleLamp).not.toHaveBeenCalled()
    })
  })

  describe('déplacements', () => {
    it('sous le seuil de 4 pixels, ce n’est pas un glissement', () => {
      const { fire, state, ctx } = setup()
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } }]
      fire('mousedown', mouse(10, 10))
      fire('mousemove', mouse(12, 12, { x: 33, y: 33 }))
      expect(ctx.onMoveCamera).not.toHaveBeenCalled()
    })
    it.each([
      ['camera', { layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } }, 'onMoveCamera', ['c1', 30, 40]],
      ['lampe', { layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l1' } }, 'onMoveLamp', ['l1', 30, 40]],
      ['prise', { layer: 'plan-saisie', properties: { kind: 'plug-hit', id: 'p1' } }, 'onMovePlug', ['p1', 30, 40]],
      ['arbre', { layer: 'plan-arbres', properties: { kind: 'tree', id: 't1' } }, 'onMoveTree', ['t1', 30, 40]],
    ] as const)('déplace %s', (_name, hit, callback, args) => {
      const { drag, ctx } = setup()
      drag(hit, { x: 30.2, y: 40.4 })
      expect(ctx[callback]).toHaveBeenCalledWith(...args)
    })
    it('déplace la cage de l’écart parcouru', () => {
      const { drag, ctx } = setup()
      drag({ layer: 'plan-cage', properties: { kind: 'cage', id: 'cage' } }, { x: 30, y: 40 }, { x: 10, y: 10 })
      expect(ctx.onMoveCage).toHaveBeenCalledWith(30, 50)
    })
    it.each([
      ['garage', 'plan-garage', 'garage', { dx: 5, dy: 6 }],
      ['portail', 'plan-portes', 'gate', { dx: 0, dy: 0 }],
    ])('déplace %s avec son décalage de départ', (id, layer, kind, base) => {
      const { drag, ctx } = setup()
      drag({ layer, properties: { kind, id } }, { x: 20, y: 30 }, { x: 10, y: 10 })
      expect(ctx.onMoveOffset).toHaveBeenCalledWith(id, base.dx + 10, base.dy + 20)
    })
    it('règle le rayon d’un arbre, borné', () => {
      const { drag, ctx } = setup()
      const handle = { layer: 'plan-poignees', properties: { kind: 'tree-handle', id: 't1' } }
      drag(handle, { x: 80, y: 50 })
      expect(ctx.onResizeTree).toHaveBeenLastCalledWith('t1', 30)
      drag(handle, { x: 50, y: 50 })
      expect(ctx.onResizeTree).toHaveBeenLastCalledWith('t1', 5)
      drag(handle, { x: 5000, y: 50 })
      expect(ctx.onResizeTree).toHaveBeenLastCalledWith('t1', 400)
    })
    it('un arbre inconnu n’est pas redimensionné', () => {
      const { drag, ctx } = setup({ trees: [] })
      drag({ layer: 'plan-poignees', properties: { kind: 'tree-handle', id: 'fantome' } }, { x: 80, y: 50 })
      expect(ctx.onResizeTree).not.toHaveBeenCalled()
    })
    it('règle la direction, la longueur et l’ouverture d’une caméra', () => {
      const { drag, ctx } = setup()
      const handle = { layer: 'plan-poignees', properties: { kind: 'camera-handle', id: 'c1' } }
      // à droite de la caméra : 90°, distance 24 -> far 200, fov 60
      drag(handle, { x: 124, y: 100 })
      expect(ctx.onAdjustCamera).toHaveBeenLastCalledWith('c1', { angle: 90, far: 200, fov: 60 })
      // vers le haut, très près : far borné à 60, fov proportionnel (18) puis borné à 10..140
      drag(handle, { x: 100, y: 99 })
      expect(ctx.onAdjustCamera).toHaveBeenLastCalledWith('c1', { angle: 0, far: 60, fov: 18 })
      // vers le bas (angle négatif ramené dans 0..360), très loin : far 700, fov 210 borné à 140
      drag(handle, { x: 100, y: 5000 })
      expect(ctx.onAdjustCamera).toHaveBeenLastCalledWith('c1', { angle: 180, far: 700, fov: 140 })
      // gauche : angle négatif remis dans 0..360
      drag(handle, { x: 0, y: 100 })
      expect(ctx.onAdjustCamera).toHaveBeenLastCalledWith('c1', { angle: 270, far: 700, fov: 140 })
    })
    it('un fov trop petit est relevé à 10', () => {
      const { drag, ctx } = setup({ cameras: [{ ...cam, fov: 12 }] })
      drag({ layer: 'plan-poignees', properties: { kind: 'camera-handle', id: 'c1' } }, { x: 100, y: 99 })
      expect(ctx.onAdjustCamera).toHaveBeenLastCalledWith('c1', { angle: 0, far: 60, fov: 10 })
    })
    it('la poignée posée pile sur la caméra, ou sur une caméra disparue : rien', () => {
      const { drag, ctx, fire, state } = setup()
      drag({ layer: 'plan-poignees', properties: { kind: 'camera-handle', id: 'c1' } }, { x: 100, y: 100 })
      expect(ctx.onAdjustCamera).not.toHaveBeenCalled()
      state.hits = [{ layer: 'plan-poignees', properties: { kind: 'camera-handle', id: 'fantome' } }]
      fire('mousedown', mouse(10, 10))
      fire('mousemove', mouse(100, 100, { x: 5, y: 5 }))
      expect(ctx.onAdjustCamera).not.toHaveBeenCalled()
    })
    it('déplace une haie entière', () => {
      const { drag, ctx } = setup()
      drag({ layer: 'plan-haies', properties: { kind: 'hedge', id: 'h1' } }, { x: 5, y: 7 }, { x: 1, y: 2 })
      expect(ctx.onMoveHedge).toHaveBeenCalledWith('h1', [
        [4, 5],
        [14, 15],
        [24, 25],
      ])
    })
    it('déplace un sommet de haie', () => {
      const { drag, ctx } = setup()
      drag({ layer: 'plan-poignees', properties: { kind: 'hedge-vertex', id: 'h1', index: 1 } }, { x: 33, y: 44 })
      expect(ctx.onMoveHedge).toHaveBeenCalledWith('h1', [
        [0, 0],
        [33, 44],
        [20, 20],
      ])
    })
    it('une haie inconnue ne bouge pas', () => {
      const { drag, ctx } = setup({ hedges: [] })
      drag({ layer: 'plan-haies', properties: { kind: 'hedge', id: 'h1' } }, { x: 5, y: 7 })
      drag({ layer: 'plan-poignees', properties: { kind: 'hedge-vertex', id: 'h1', index: 0 } }, { x: 5, y: 7 })
      expect(ctx.onMoveHedge).not.toHaveBeenCalled()
    })
    it('si le rappel a disparu pendant le geste, rien ne casse', () => {
      const fake = fakeMap()
      let ctx = context()
      attachEditing(fake.map, () => ctx)
      const kinds = [
        { layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } },
        { layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l' } },
        { layer: 'plan-saisie', properties: { kind: 'plug-hit', id: 'p' } },
        { layer: 'plan-arbres', properties: { kind: 'tree', id: 't1' } },
        { layer: 'plan-cage', properties: { kind: 'cage', id: 'cage' } },
        { layer: 'plan-garage', properties: { kind: 'garage', id: 'garage' } },
        { layer: 'plan-poignees', properties: { kind: 'tree-handle', id: 't1' } },
        { layer: 'plan-poignees', properties: { kind: 'camera-handle', id: 'c1' } },
        { layer: 'plan-haies', properties: { kind: 'hedge', id: 'h1' } },
        { layer: 'plan-poignees', properties: { kind: 'hedge-vertex', id: 'h1', index: 0 } },
      ]
      for (const hit of kinds) {
        ctx = context()
        fake.state.hits = [hit]
        fake.handlers.get('mousedown')?.(mouse(10, 10))
        ctx = context({
          onMoveCamera: undefined,
          onMoveLamp: undefined,
          onMovePlug: undefined,
          onMoveTree: undefined,
          onMoveCage: undefined,
          onMoveOffset: undefined,
          onResizeTree: undefined,
          onAdjustCamera: undefined,
          onMoveHedge: undefined,
        })
        fake.handlers.get('mousemove')?.(mouse(100, 100, { x: 300, y: 300 }))
        fake.handlers.get('mouseup')?.({})
      }
    })
  })

  describe('relâchement et clic', () => {
    it('relâcher sans rien tenir est sans effet', () => {
      const { fire, canvas } = setup()
      canvas.style.cursor = 'x'
      fire('mouseup')
      expect(canvas.style.cursor).toBe('')
    })
    it('un clic sur une haie la choisit', () => {
      const { fire, state, ctx } = setup()
      state.hits = [{ layer: 'plan-haies', properties: { kind: 'hedge', id: 'h1' } }]
      fire('mousedown', mouse(1, 1))
      fire('mouseup')
      expect(ctx.onSelectHedge).toHaveBeenCalledWith('h1')
    })
    it('un clic sur une lampe ne choisit ni caméra ni haie', () => {
      const { fire, state, ctx } = setup()
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'lamp-hit', id: 'l' } }]
      fire('mousedown', mouse(1, 1))
      fire('mouseup')
      expect(ctx.onSelectCamera).not.toHaveBeenCalled()
      expect(ctx.onSelectHedge).not.toHaveBeenCalled()
    })
    it('un glissement n’est pas un clic, et le clic qui le suit n’efface pas la sélection', () => {
      const { drag, fire, ctx, state } = setup()
      drag({ layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } }, { x: 30, y: 40 })
      fire('mouseup')
      expect(ctx.onSelectCamera).not.toHaveBeenCalled()
      state.hits = []
      fire('click', mouse(1, 1))
      expect(ctx.onSelectCamera).not.toHaveBeenCalled()
      // le clic suivant, lui, désélectionne
      fire('click', mouse(1, 1))
      expect(ctx.onSelectCamera).toHaveBeenCalledWith('')
      expect(ctx.onSelectTree).toHaveBeenCalledWith('')
      expect(ctx.onSelectHedge).toHaveBeenCalledWith('')
    })
    it('un clic sur un élément ne désélectionne pas', () => {
      const { fire, state, ctx } = setup()
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } }]
      fire('click', mouse(1, 1))
      expect(ctx.onSelectCamera).not.toHaveBeenCalled()
    })
    it('un clic dans le vide sans rappels de choix ne casse rien', () => {
      const { fire } = setup({ onSelectCamera: undefined, onSelectTree: undefined, onSelectHedge: undefined })
      fire('click', mouse(1, 1))
    })
    it('relâcher une caméra sans rappel de choix, ou une haie sans rappel', () => {
      const { fire, state } = setup({ onSelectCamera: undefined, onSelectHedge: undefined })
      state.hits = [{ layer: 'plan-saisie', properties: { kind: 'camera-hit', id: 'c1' } }]
      fire('mousedown', mouse(1, 1))
      fire('mouseup')
      state.hits = [{ layer: 'plan-haies', properties: { kind: 'hedge', id: 'h1' } }]
      fire('mousedown', mouse(1, 1))
      fire('mouseup')
    })
  })
})
