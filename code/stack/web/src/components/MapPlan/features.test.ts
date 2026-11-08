import type { PlanCamera, PlanGate, PlanHedge, PlanLamp, PlanPlug, PlanTree } from '@house/ui'
import { PLAN_GATES, PLAN_ROOMS, PLAN_WALLS } from '@/components/Lights/constants'
import {
  cameraHandle,
  HANDLE_DISTANCE,
  HANDLE_RATIO,
  liveFeatures,
  readPalette,
  staticFeatures,
  type LiveData,
  type Palette,
} from './features'

const palette: Palette = { accent: 'A', bg: 'B', fg: 'F', muted: 'M', orange: 'O', green: 'G', danger: 'D' }

const camera = (over: Partial<PlanCamera> = {}): PlanCamera => ({
  id: 'c1',
  name: 'c',
  x: 100,
  y: 100,
  angle: 90,
  fov: 60,
  near: 10,
  far: 200,
  ...over,
})

const data = (over: Partial<LiveData> = {}): LiveData => ({
  offsets: {},
  gates: PLAN_GATES as PlanGate[],
  cage: { x: 583, y: 0, w: 100, h: 200 },
  hedges: [
    {
      id: 'h1',
      points: [
        [0, 0],
        [10, 10],
      ],
    },
    {
      id: 'h2',
      points: [
        [5, 5],
        [6, 6],
      ],
    },
  ] as PlanHedge[],
  trees: [
    { id: 't1', x: 0, y: 0, r: 5 },
    { id: 't2', x: 50, y: 50, r: 400 },
  ] as PlanTree[],
  cameras: [camera(), camera({ id: 'c2', off: true } as Partial<PlanCamera>)],
  lamps: [
    { id: 'l1', x: 1, y: 1, on: true, reachable: true },
    { id: 'l2', x: 2, y: 2, on: true, reachable: false },
    { id: 'l3', x: 3, y: 3, on: false, reachable: true },
  ] as PlanLamp[],
  plugs: [
    { id: 'p1', x: 1, y: 1, on: true },
    { id: 'p2', x: 2, y: 2, on: false },
  ] as PlanPlug[],
  selectedHedgeId: '',
  selectedTreeId: '',
  selectedCameraId: '',
  canEditHedges: true,
  canResizeTrees: true,
  canAdjustCameras: true,
  ...over,
})

const props = (collection: { features: { properties: unknown }[] }) =>
  collection.features.map((f) => f.properties as Record<string, string | number>)

describe('readPalette', () => {
  it('prend les valeurs de repli sans variables CSS', () => {
    expect(readPalette().accent).toBe('#2f7de1')
  })
  it('lit les variables CSS de la page', () => {
    document.documentElement.style.setProperty('--accent', ' #123456 ')
    expect(readPalette().accent).toBe('#123456')
    document.documentElement.style.removeProperty('--accent')
  })
})

describe('staticFeatures', () => {
  it('le béton, le toit, puis les pièces et les cloisons', () => {
    const parts = props(staticFeatures()).map((p) => p.part)
    expect(parts).toEqual(['concrete', 'roof', ...PLAN_ROOMS.map(() => 'room'), ...PLAN_WALLS.map(() => 'wall')])
  })

  it('une pièce en L est un seul contour (union de ses rectangles)', () => {
    const features = staticFeatures().features
    const salon = features.find((f) => (f.properties as { name?: string }).name === 'Salon')
    expect(salon?.geometry.type).toBe('MultiPolygon')
    const polygons = (salon?.geometry as { coordinates: unknown[][] }).coordinates
    expect(polygons).toHaveLength(1)
  })

  it('le claustra est marqué « screen », pas la cloison pleine', () => {
    const walls = props(staticFeatures()).filter((p) => p.part === 'wall')
    expect(walls.map((w) => w.screen)).toEqual(PLAN_WALLS.map((w) => (w.screen ? 1 : 0)))
    expect(walls.some((w) => w.screen === 1)).toBe(true)
    expect(walls.some((w) => w.screen === 0)).toBe(true)
  })
})

describe('cameraHandle', () => {
  it('reste à la distance minimale pour une vue courte, s’éloigne pour une vue longue', () => {
    const [x1, y1] = cameraHandle(camera({ angle: 0, far: 10 }))
    expect(y1).toBeCloseTo(100 - HANDLE_DISTANCE)
    expect(x1).toBeCloseTo(100)
    const [, y2] = cameraHandle(camera({ angle: 0, far: 1000 }))
    expect(y2).toBeCloseTo(100 - 1000 * HANDLE_RATIO)
  })
})

describe('liveFeatures', () => {
  it('fabrique les formes et les points de chaque élément, rien de choisi', () => {
    const { shapes, points } = liveFeatures(data(), palette)
    const kinds = props(shapes).map((p) => p.kind)
    expect(kinds).toEqual(expect.arrayContaining(['tiles', 'garage', 'cage', 'gate', 'hedge', 'tree', 'camera', 'lamp', 'plug']))
    expect(kinds).not.toContain('fov')
    expect(
      props(points)
        .map((p) => p.kind)
        .sort(),
    ).toEqual(['camera-hit', 'camera-hit', 'lamp-hit', 'lamp-hit', 'lamp-hit', 'plug-hit', 'plug-hit'])
  })

  it('applique les décalages au chemin du garage et aux portes', () => {
    const plain = liveFeatures(data(), palette).shapes.features
    const shifted = liveFeatures(data({ offsets: { garage: { dx: 10, dy: 5 }, portail: { dx: 3, dy: 3 } } }), palette).shapes.features
    const garage = (list: typeof plain) => list.find((f) => (f.properties as { kind: string }).kind === 'garage')?.geometry
    const gate = (list: typeof plain) => list.find((f) => (f.properties as { id: string }).id === 'portail')?.geometry
    expect(garage(shifted)).not.toEqual(garage(plain))
    expect(gate(shifted)).not.toEqual(gate(plain))
  })

  it('un élément choisi montre sa poignée, sa vue et se met en valeur', () => {
    const { shapes, points } = liveFeatures(data({ selectedHedgeId: 'h1', selectedTreeId: 't1', selectedCameraId: 'c1' }), palette)
    const kinds = props(points).map((p) => p.kind)
    expect(kinds.filter((k) => k === 'hedge-vertex')).toHaveLength(2)
    expect(kinds).toContain('tree-handle')
    expect(kinds).toContain('camera-handle')
    const all = props(shapes)
    expect(all.some((p) => p.kind === 'fov')).toBe(true)
    expect(all.find((p) => p.id === 'h1')?.selected).toBe(1)
    expect(all.find((p) => p.id === 'h2')?.selected).toBe(0)
    expect(all.find((p) => p.id === 't1')).toMatchObject({ stroke: 'A', strokeWidth: 3 })
    expect(all.find((p) => p.id === 't2')).toMatchObject({ stroke: 'G', strokeWidth: 1.5 })
    expect(all.find((p) => p.kind === 'camera' && p.id === 'c1')?.stroke).toBe('A')
    expect(all.find((p) => p.kind === 'camera' && p.id === 'c2')?.stroke).toBe('D')
  })

  it('sans droit de modification : pas de poignées', () => {
    const { points } = liveFeatures(
      data({
        selectedHedgeId: 'h1',
        selectedTreeId: 't1',
        selectedCameraId: 'c1',
        canEditHedges: false,
        canResizeTrees: false,
        canAdjustCameras: false,
      }),
      palette,
    )
    expect(
      props(points)
        .map((p) => String(p.kind))
        .filter((k) => k.includes('handle') || k.includes('vertex')),
    ).toEqual([])
  })

  it('couleurs des lampes et des prises, vert des arbres selon la taille', () => {
    const { shapes } = liveFeatures(data(), palette)
    const all = props(shapes)
    expect(all.find((p) => p.id === 'l1')).toMatchObject({ color: 'O', stroke: 'F' })
    expect(all.find((p) => p.id === 'l2')).toMatchObject({ color: 'B', stroke: 'D' })
    expect(all.find((p) => p.id === 'l3')).toMatchObject({ color: 'B', stroke: 'M' })
    expect(all.find((p) => p.id === 'p1')?.color).toBe('G')
    expect(all.find((p) => p.id === 'p2')?.color).toBe('D')
    expect(all.find((p) => p.id === 't1')?.color).toBe('hsla(140, 50%, 62%, 0.85)')
    expect(all.find((p) => p.id === 't2')?.color).toBe('hsla(140, 50%, 20%, 0.85)')
  })

  it('l’opacité d’une lampe suit sa luminosité (pleine éteinte, injoignable ou sans luminosité)', () => {
    const lamps = [
      { id: 'a', x: 1, y: 1, on: true, reachable: true, brightness: 254 },
      { id: 'b', x: 1, y: 1, on: true, reachable: true, brightness: 1 },
      { id: 'c', x: 1, y: 1, on: false, reachable: true, brightness: 1 },
      { id: 'd', x: 1, y: 1, on: true, reachable: true, brightness: null },
    ] as PlanLamp[]
    const all = props(liveFeatures(data({ lamps }), palette).shapes)
    const opacity = (id: string) => Number(all.find((p) => p.id === id)?.opacity)
    expect(opacity('a')).toBe(1)
    expect(opacity('b')).toBeLessThan(0.6)
    expect(opacity('c')).toBe(1)
    expect(opacity('d')).toBe(1)
  })

  it('un arbre plus petit que 15 reste au vert le plus clair', () => {
    const { shapes } = liveFeatures(data({ trees: [{ id: 'x', x: 0, y: 0, r: 1 }] as PlanTree[] }), palette)
    expect(props(shapes).find((p) => p.id === 'x')?.color).toBe('hsla(140, 50%, 62%, 0.85)')
  })
})

describe('roomFeature sans rectangle', () => {
  it('une pièce sans rectangle donne une forme vide, sans casser', async () => {
    vi.resetModules()
    vi.doMock('@/components/Lights/constants', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/components/Lights/constants')>()),
      PLAN_ROOMS: [{ name: 'Vide', rects: [] }],
    }))
    const mocked = await import('./features')
    const room = mocked.staticFeatures().features.find((f) => (f.properties as { part?: string }).part === 'room')
    expect(room?.geometry).toEqual({ type: 'MultiPolygon', coordinates: [] })
    vi.doUnmock('@/components/Lights/constants')
    vi.resetModules()
  })
})

describe('tilesFeature sans sols de départ', () => {
  it('se passe des sols à droite de la maison et du joint', async () => {
    vi.resetModules()
    vi.doMock('@/components/Lights/constants', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/components/Lights/constants')>()),
      PLAN_FLOORS: [],
    }))
    const mocked = await import('./features')
    const { shapes } = mocked.liveFeatures(data(), palette)
    expect(props(shapes).some((p) => p.kind === 'tiles')).toBe(true)
    vi.doUnmock('@/components/Lights/constants')
    vi.resetModules()
  })
})
