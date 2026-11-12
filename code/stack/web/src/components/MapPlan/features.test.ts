import type { PlanCamera, PlanGate, PlanHedge, PlanLamp, PlanPlug, PlanTree } from '@house/ui'
import { PLAN_ENTRANCE_WALL, PLAN_GATES, PLAN_OPENINGS, PLAN_ROOMS, PLAN_WALLS } from '@/components/Lights/constants'
import {
  cameraHandle,
  HANDLE_DISTANCE,
  HANDLE_RATIO,
  liveFeatures,
  readPalette,
  defaultRoomRects,
  staticFeatures,
  type LiveData,
  type Palette,
} from './features'
import { fromHousePlan } from './helpers'
import { lngLatToPlan, planToLngLat } from './projection'

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
  tiles: null,
  decors: [],
  garage: null,
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
  acs: [],
  shutters: [],
  labels: [],
  emojis: [],
  plugs: [
    { id: 'p1', x: 1, y: 1, on: true },
    { id: 'p2', x: 2, y: 2, on: false },
  ] as PlanPlug[],
  hoveredCameraId: '',
  selectedCameraId: '',
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
  it('le béton, le toit, les pièces, puis les murs (le contour des pièces, puis les cloisons)', () => {
    const parts = props(staticFeatures()).map((p) => p.part)
    // Toutes les pièces en un seul contour (pas de couture entre deux pièces voisines).
    expect(parts.slice(0, 3)).toEqual(['concrete', 'roof', 'room'])
    expect(parts.filter((part) => part === 'room')).toHaveLength(1)
    expect(parts.slice(2 + PLAN_ROOMS.length).every((part) => part === 'wall')).toBe(true)
    // les cloisons sont les derniers traits
    expect(parts.slice(-PLAN_WALLS.length)).toEqual(PLAN_WALLS.map(() => 'wall'))
  })

  it('le contour des pièces est en traits de mur, sans ce qui tombe sur une ouverture', () => {
    const lines = staticFeatures().features.filter((f) => f.geometry.type === 'LineString')
    // la cuisine est ouverte sur le salon : le mur y2 = 140 de x = 289 à x = 420 n'est pas dessiné
    const [opening] = PLAN_OPENINGS
    const from = fromHousePlan(opening.x1, opening.y1)
    const to = fromHousePlan(opening.x2, opening.y2)
    const onOpening = lines.filter((f) => {
      const [a, b] = (f.geometry as unknown as { coordinates: [number, number][] }).coordinates.map(([lng, lat]) => lngLatToPlan(lng, lat))
      return (
        Math.abs(a[1] - from.y) < 0.01 &&
        Math.abs(b[1] - to.y) < 0.01 &&
        Math.min(a[0], b[0]) >= from.x - 0.01 &&
        Math.max(a[0], b[0]) <= to.x + 0.01
      )
    })
    expect(onOpening).toHaveLength(0)
  })

  it('toutes les pièces sont un seul contour : pas de trait au milieu d’une pièce en L, ni de couture entre deux pièces', () => {
    const rooms = staticFeatures().features.filter((f) => (f.properties as { part?: string }).part === 'room')
    expect(rooms).toHaveLength(1)
    expect(rooms[0].geometry.type).toBe('MultiPolygon')
    // La maison d'un bloc : un seul polygone, sans trou entre les pièces voisines.
    const polygons = (rooms[0].geometry as { coordinates: unknown[][][] }).coordinates
    expect(polygons).toHaveLength(1)
    expect(polygons[0]).toHaveLength(1)
  })

  it('le mur de l’entrée suit le mur sud de la pièce Entrée, où qu’elle soit', () => {
    const rooms = defaultRoomRects()
    const index = PLAN_ROOMS.findIndex((room) => room.name === 'Entrée')
    const moved = rooms.map((room, position) => (position === index ? [{ ...room[0], y1: 20, y2: 77 }, ...room.slice(1)] : room))
    const [lng, lat] = planToLngLat(fromHousePlan(PLAN_ENTRANCE_WALL.fromX, 0).x, 77)
    const hasWall = (shown: typeof rooms) =>
      staticFeatures(shown).features.some(
        (f) =>
          f.geometry.type === 'LineString' && f.geometry.coordinates.some(([x, y]) => Math.abs(x - lng) < 1e-9 && Math.abs(y - lat) < 1e-9),
      )
    // Le mur part de la lampe « Entrée » à la hauteur du mur sud de la pièce déplacée (y = 77), pas à celle de départ.
    expect(hasWall(moved)).toBe(true)
    expect(hasWall(rooms)).toBe(false)
  })

  it('un vide entre des pièces déplacées à la main est rempli : la maison n’a que son contour extérieur', () => {
    // Quatre rectangles autour d'un vide au milieu.
    const ring = (x1: number, y1: number, x2: number, y2: number) => ({ x1, y1, x2, y2 })
    const rooms = [[ring(0, 0, 30, 10)], [ring(0, 20, 30, 30)], [ring(0, 10, 10, 20)], [ring(20, 10, 30, 20)]]
    const room = staticFeatures(rooms).features.find((f) => (f.properties as { part?: string }).part === 'room')
    const polygons = (room?.geometry as { coordinates: unknown[][] }).coordinates
    expect(polygons).toHaveLength(1)
    expect(polygons[0]).toHaveLength(1)
  })
  it('tous les murs sont pleins (plus de claustra en pointillé)', () => {
    const walls = props(staticFeatures()).filter((p) => p.part === 'wall')
    expect(walls.length).toBeGreaterThan(0)
    expect(walls.every((w) => !('screen' in w))).toBe(true)
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
    expect(kinds).toEqual(expect.arrayContaining(['tiles', 'garage', 'cage', 'gate', 'hedge', 'tree']))
    // les caméras, les ampoules et les climatisations sont des icônes d'un calque de symboles (sur leur point), plus des polygones
    for (const icon of ['camera', 'lamp', 'ac', 'plug']) expect(kinds).not.toContain(icon)
    expect(kinds).not.toContain('fov')
    expect(
      props(points)
        .map((p) => p.kind)
        .sort(),
    ).toEqual(['camera-hit', 'camera-hit', 'lamp-hit', 'lamp-hit', 'lamp-hit', 'plug-hit', 'plug-hit'])
  })

  it('chaque icône seule (pompe à chaleur, routeur) a sa zone de saisie, avec son image', () => {
    const decors = [{ id: 'pac', x: 1, y: 2, image: 'img-pac' }]
    const hits = liveFeatures(data({ decors }), palette).points.features.filter((f) => (f.properties as { kind: string }).kind === 'decor-hit')
    expect(hits.map((f) => f.properties)).toEqual([expect.objectContaining({ id: 'pac', image: 'img-pac' })])
  })

  it('un contour des carreaux gardé dans le plan remplace le calculé', () => {
    const ring: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 50],
    ]
    const tiles = (over: Partial<LiveData>) =>
      liveFeatures(data(over), palette).shapes.features.find((f) => (f.properties as { kind: string }).kind === 'tiles')?.geometry
    expect(tiles({})?.type).toBe('MultiPolygon')
    expect(tiles({ tiles: ring })?.type).toBe('Polygon')
  })

  it('un contour du chemin du garage gardé dans le plan remplace celui de départ', () => {
    const ring: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 5],
    ]
    const garage = (over: Partial<LiveData>) =>
      liveFeatures(data(over), palette).shapes.features.find((f) => (f.properties as { kind: string }).kind === 'garage')?.geometry
    expect(garage({ garage: ring })).not.toEqual(garage({}))
  })

  it('aucune poignée de coin, de milieu, de sommet ou d’arbre n’est dessinée', () => {
    const kinds = props(liveFeatures(data({ selectedCameraId: 'c1', canAdjustCameras: true }), palette).points).map((p) => String(p.kind))
    expect(kinds.filter((k) => k.includes('vertex') || k.includes('-mid') || k === 'tree-handle')).toEqual([])
  })

  it('applique les décalages au chemin du garage et aux portes', () => {
    const plain = liveFeatures(data(), palette).shapes.features
    const shifted = liveFeatures(data({ offsets: { garage: { dx: 10, dy: 5 }, portail: { dx: 3, dy: 3 } } }), palette).shapes.features
    const garage = (list: typeof plain) => list.find((f) => (f.properties as { kind: string }).kind === 'garage')?.geometry
    const gate = (list: typeof plain) => list.find((f) => (f.properties as { id: string }).id === 'portail')?.geometry
    expect(garage(shifted)).not.toEqual(garage(plain))
    expect(gate(shifted)).not.toEqual(gate(plain))
  })

  it('une caméra choisie montre sa poignée et sa vue', () => {
    const { shapes, points } = liveFeatures(data({ selectedCameraId: 'c1' }), palette)
    const kinds = props(points).map((p) => p.kind)
    expect(kinds).toContain('camera-handle')
    const all = props(shapes)
    expect(all.some((p) => p.kind === 'fov')).toBe(true)
    expect(all.find((p) => p.id === 'h1')).toMatchObject({ kind: 'hedge' })
    expect(all.find((p) => p.id === 't1')).toMatchObject({ stroke: 'G', strokeWidth: 1.5 })
    // l'état d'une caméra est sur son point : allumée (contour vert), éteinte (rond rouge) ou inexistante (caméra rouge)
    const hits = props(points).filter((p) => p.kind === 'camera-hit')
    expect(hits.find((p) => p.id === 'c1')?.state).toBe('on')
    expect(hits.find((p) => p.id === 'c2')?.state).toBe('off')
  })

  it('sans droit de modification : pas de poignées', () => {
    const { points } = liveFeatures(
      data({
        selectedCameraId: 'c1',
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
    // une ampoule : son point porte la couleur de son icône (orange par défaut allumée, rouge injoignable, grise éteinte)
    const bulbs = props(liveFeatures(data(), palette).points).filter((p) => p.kind === 'lamp-hit')
    expect(bulbs.find((p) => p.id === 'l1')?.color).toBe('O')
    expect(bulbs.find((p) => p.id === 'l2')?.color).toBe('D')
    expect(bulbs.find((p) => p.id === 'l3')?.color).toBe('M')
    // la prise : son point dit si elle est allumée (icône verte) ou éteinte (rouge)
    const sockets = props(liveFeatures(data(), palette).points).filter((p) => p.kind === 'plug-hit')
    expect(sockets.find((p) => p.id === 'p1')?.on).toBe(1)
    expect(sockets.find((p) => p.id === 'p2')?.on).toBe(0)
    expect(all.find((p) => p.id === 't1')?.color).toBe('hsla(140, 50%, 62%, 0.45)')
    expect(all.find((p) => p.id === 't2')?.color).toBe('hsla(140, 50%, 20%, 0.45)')
  })

  it('la couleur d’une lampe pâlit avec sa luminosité (inchangée éteinte, injoignable ou sans luminosité), sans opacité', () => {
    const lamps = [
      { id: 'a', x: 1, y: 1, on: true, reachable: true, brightness: 254, color: '#ff8000' },
      { id: 'b', x: 1, y: 1, on: true, reachable: true, brightness: 1, color: '#ff8000' },
      { id: 'c', x: 1, y: 1, on: false, reachable: true, brightness: 1, color: '#ff8000' },
      { id: 'd', x: 1, y: 1, on: true, reachable: true, brightness: null, color: '#ff8000' },
    ] as PlanLamp[]
    const all = props(liveFeatures(data({ lamps }), palette).points)
    const color = (id: string) => all.find((p) => p.id === id)?.color
    expect(color('a')).toBe('#ff8000')
    expect(color('b')).not.toBe('#ff8000')
    expect(color('c')).toBe(palette.muted)
    expect(color('d')).toBe('#ff8000')
    expect(all.find((p) => p.id === 'b')).not.toHaveProperty('opacity')
  })

  it('un arbre plus petit que 15 reste au vert le plus clair', () => {
    const { shapes } = liveFeatures(data({ trees: [{ id: 'x', x: 0, y: 0, r: 1 }] as PlanTree[] }), palette)
    expect(props(shapes).find((p) => p.id === 'x')?.color).toBe('hsla(140, 50%, 62%, 0.45)')
  })
})

describe('roomsFeature sans rectangle', () => {
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

describe('liveFeatures : clim, volet, étiquette, emoji, caméra absente, couleur de lampe', () => {
  it('chaque objet connecté donne son point avec son état', () => {
    const { points } = liveFeatures(
      data({
        cameras: [camera({ id: 'm', missing: true }), camera({ id: 'o', off: true } as Partial<PlanCamera>)],
        lamps: [{ id: 'lc', x: 1, y: 1, on: true, reachable: true, color: '#112233' }] as PlanLamp[],
        acs: [
          { id: 'a1', name: 'a', x: 1, y: 1, on: true, reachable: true, label: '' },
          { id: 'a2', name: 'a', x: 1, y: 1, on: false, reachable: true, rotation: 90, label: '' },
          { id: 'a3', name: 'a', x: 1, y: 1, on: true, reachable: false, label: '' },
        ],
        shutters: [
          { id: 's1', name: 's', x: 1, y: 1, closed: true, label: '' },
          { id: 's2', name: 's', x: 1, y: 1, closed: false, label: '' },
        ],
        labels: [{ id: 'e1', name: 'e', x: 1, y: 1, text: '21°' }],
        emojis: [{ id: 'k1', emoji: '🦊', x: 1, y: 1 }],
      }),
      palette,
    )
    const all = props(points)
    const cameraHits = all.filter((p) => p.kind === 'camera-hit')
    expect(cameraHits.map((p) => p.state)).toEqual(['missing', 'off'])
    // Une caméra éteinte reste cliquable ; seule une caméra sans vraie caméra est inactive.
    expect(cameraHits.map((p) => p.inactive)).toEqual([1, 0])
    expect(all.find((p) => p.kind === 'lamp-hit')?.color).toBe('#112233')
    const acs = all.filter((p) => p.kind === 'ac-hit')
    expect(acs.map((p) => p.state)).toEqual(['on', 'off', 'lost'])
    expect(acs.map((p) => p.rotate)).toEqual([0, 90, 0])
    expect(all.filter((p) => p.kind === 'shutter-hit').map((p) => p.closed)).toEqual([1, 0])
    expect(all.find((p) => p.kind === 'label-hit')?.temp).toBe('21°')
    expect(all.find((p) => p.kind === 'emoji-hit')?.emoji).toBe('🦊')
  })
})

describe('roomWalls : les ouvertures', () => {
  it('coupe les murs horizontaux et verticaux, ignore celles qui tombent à côté ou ailleurs', async () => {
    vi.resetModules()
    vi.doMock('@/components/Lights/constants', async (importOriginal) => ({
      ...(await importOriginal<typeof import('@/components/Lights/constants')>()),
      PLAN_ROOMS: [{ name: 'A', rects: [{ x: 0, y: 0, w: 100, h: 100 }] }],
      PLAN_OPENINGS: [
        { x1: 40, y1: 0, x2: 20, y2: 0 },
        { x1: 0, y1: 10, x2: 0, y2: 100 },
        { x1: -10, y1: 100, x2: 30, y2: 100 },
        { x1: 150, y1: 100, x2: 200, y2: 100 },
        { x1: 100, y1: -10, x2: 100, y2: 30 },
        { x1: 0, y1: 200, x2: 50, y2: 200 },
      ],
    }))
    const mocked = await import('./features')
    const parts = mocked.staticFeatures().features.filter((f) => (f.properties as { part?: string }).part === 'wall')
    expect(parts.length - PLAN_WALLS.length).toBe(5)
    vi.doUnmock('@/components/Lights/constants')
    vi.resetModules()
  })
})
