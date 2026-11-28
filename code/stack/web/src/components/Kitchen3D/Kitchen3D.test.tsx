import { act, fireEvent, render, screen } from '@testing-library/react'
import * as THREE from 'three'
import type { PlanLamp } from '@house/ui'
import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { MAP_HOUSE_HEIGHT } from '@/components/MapPlan/constants'
import { fakeContext2d, stubCanvasContext } from '@/test/canvas'
import type { AcUnit, CameraPower, HueSensor, PlugState, ShutterCommand, ShuttersState } from '@/types'
import { DAYLIGHT, LAMP_LIGHT, LAYOUT, MATRIX_LABEL, NO_WEBGL_TEXT, PLAN_HOUSE, QUALITY, ROOM, SCREEN_OFF, SHUTTER_ANIMATE_MS, START, TARGET, TOP, VIEW_HEIGHT, WHEEL_STEP } from './constants'
import type { Quality } from './constants'
import Kitchen3D from './Kitchen3D'
import { INDOOR, OUTDOOR } from './layers'
import { LIGHT_KEY } from './light'
import { AC_LED } from './live'
import { MATRIX_CAMERA, MATRIX_LIGHT } from './matrix'
import { BULB_OFF } from './primitives'
import { SHUTTER_KEYS, SHUTTER_TRAVEL_S } from './shutters'
import type { SceneParts } from './types'

interface FakeRenderer {
  options: { antialias?: boolean; alpha?: boolean }
  domElement: HTMLCanvasElement
  shadowMap: { enabled: boolean; type: number; autoUpdate: boolean; needsUpdate: boolean }
  setPixelRatio: ReturnType<typeof vi.fn>
  setClearColor: ReturnType<typeof vi.fn>
  setSize: ReturnType<typeof vi.fn>
  /** La cible du moment : null pour l'écran, sinon la texture d'un écran de la scène (`tv.ts`). */
  target: unknown
  autoClear: boolean
  setRenderTarget: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  forceContextLoss: ReturnType<typeof vi.fn>
}

/** Une passe de rendu : les couches que voit la caméra, si elle va dans la texture d'un écran, si l'ombre du soleil est refaite, si l'image d'avant est effacée. */
interface Shot {
  mask: number
  screen: boolean
  stale: boolean
  autoClear: boolean
}

interface FakeControls {
  object: THREE.PerspectiveCamera
  domElement: HTMLElement
  target: THREE.Vector3
  mouseButtons: Record<string, number>
  enableDamping: boolean
  minDistance: number
  maxDistance: number
  /** Le nombre d'images pendant lesquelles la caméra finit encore sa course (amortissement) : `update` la fait alors bouger. */
  settling: number
  listeners: Set<() => void>
  /** La caméra bouge : l'événement `change` des vrais contrôles. */
  move: () => void
  update: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

const h = vi.hoisted(() => ({
  supported: true,
  mobile: false,
  qualities: [] as Quality[],
  frameId: 0,
  lamps: [] as PlanLamp[],
  toggle: (() => undefined) as (id: string) => void,
  units: null as AcUnit[] | null,
  change: (() => undefined) as (id: string, change: { on: boolean }) => void,
  shutters: null as ShuttersState | null,
  send: (() => undefined) as (id: string, command: ShutterCommand) => void,
  weather: null as { isDay: boolean; code: number } | null,
  plug: null as PlugState | null,
  setPlug: ((): Promise<unknown> => Promise.resolve()) as (key: string, on: boolean) => Promise<unknown>,
  sensors: [] as HueSensor[],
  power: ((): Promise<CameraPower[]> => Promise.resolve([])) as (key: string) => Promise<CameraPower[]>,
  /** Retire les voyants du switch de la scène construite (une scène sans rien qui clignote). */
  noBlink: false,
  shots: [] as Shot[],
  planKeys: [] as string[],
  renderers: [] as FakeRenderer[],
  controls: [] as FakeControls[],
  parts: [] as SceneParts[],
  resize: [] as (() => void)[],
  visibility: [] as ((entries: { isIntersecting: boolean }[]) => void)[],
  disconnected: [] as string[],
  frames: [] as (() => void)[],
  cancelled: [] as number[],
}))

// jsdom n'a pas de WebGL : le moteur de rendu et la caméra pilotée à la souris sont simulés, le reste de three.js est le vrai.
vi.mock('three', async (original) => {
  const actual = await original<typeof import('three')>()
  class WebGLRenderer implements FakeRenderer {
    options: FakeRenderer['options']
    domElement = document.createElement('canvas')
    shadowMap = { enabled: false, type: 0, autoUpdate: true, needsUpdate: false }
    setPixelRatio = vi.fn()
    setClearColor = vi.fn()
    setSize = vi.fn()
    target: unknown = null
    autoClear = true
    setRenderTarget = vi.fn((target: unknown) => {
      this.target = target
    })
    clear = vi.fn()
    // Comme le vrai : une fois l'ombre refaite, elle n'est plus à refaire. Chaque passe est retenue.
    render = vi.fn((_scene: THREE.Scene, shot: THREE.Camera) => {
      h.shots.push({ mask: shot.layers.mask, screen: this.target !== null, stale: this.shadowMap.needsUpdate, autoClear: this.autoClear })
      this.shadowMap.needsUpdate = false
    })
    dispose = vi.fn()
    forceContextLoss = vi.fn()
    constructor(options: FakeRenderer['options']) {
      this.options = options
      h.renderers.push(this)
    }
  }
  return { ...actual, WebGLRenderer }
})
vi.mock('three/examples/jsm/controls/OrbitControls.js', async () => {
  const { Vector3 } = await vi.importActual<typeof import('three')>('three')
  class OrbitControls implements FakeControls {
    object: THREE.PerspectiveCamera
    domElement: HTMLElement
    target = new Vector3()
    mouseButtons: Record<string, number> = {}
    enableDamping = false
    minDistance = -1
    maxDistance = -1
    settling = 0
    listeners = new Set<() => void>()
    move = () => {
      for (const listener of this.listeners) listener()
    }
    update = vi.fn(() => {
      if (this.settling === 0) return
      this.settling -= 1
      this.move()
    })
    dispose = vi.fn()
    addEventListener = (type: string, listener: () => void) => {
      if (type === 'change') this.listeners.add(listener)
    }
    removeEventListener = (_type: string, listener: () => void) => {
      this.listeners.delete(listener)
    }
    constructor(object: THREE.PerspectiveCamera, domElement: HTMLElement) {
      this.object = object
      this.domElement = domElement
      h.controls.push(this)
    }
  }
  return { OrbitControls }
})
vi.mock('@/lib/three', async (original) => ({ ...(await original<typeof import('@/lib/three')>()), supportsWebGL: () => h.supported }))
vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/lib/usePlan', () => ({ usePlan: () => ({ items: { l1: { x: 1, y: 2 } } }) }))
vi.mock('@/lib/useLampPlan', () => ({
  useLampPlan: (apiKey: string, items: Record<string, unknown>, enabled: boolean) => {
    h.planKeys.push(`${apiKey} ${Object.keys(items).join()} ${enabled}`)
    return { lamps: h.lamps, toggle: h.toggle }
  },
}))
vi.mock('@/lib/useAcUnits', () => ({ useAcUnits: () => ({ units: h.units, change: h.change }) }))
vi.mock('@/lib/useShutters', () => ({ useShutters: () => ({ state: h.shutters, send: h.send }) }))
vi.mock('@/lib/useWeather', () => ({ useWeather: () => h.weather }))
vi.mock('@/lib/usePlug', () => ({ usePlug: () => h.plug }))
vi.mock('@/lib/useSensors', () => ({ useSensors: () => h.sensors }))
vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  fetchPower: (key: string) => h.power(key),
  setPlug: (key: string, on: boolean) => h.setPlug(key, on),
}))
// La scène est la vraie ; elle est seulement retenue pour y regarder la hotte et les lumières.
vi.mock('./helpers', async (original) => {
  const actual = await original<typeof import('./helpers')>()
  return {
    ...actual,
    buildScene: (quality: Quality) => {
      const parts = actual.buildScene(quality)
      if (h.noBlink) parts.root.traverse((child) => delete child.userData.blink)
      h.qualities.push(quality)
      h.parts.push(parts)
      return parts
    },
  }
})

/** Une lampe du plan de la maison, à une place de la maison (unités du plan, 540 × 300). */
const lamp = (id: string, houseX: number, houseY: number, over: Partial<PlanLamp> = {}): PlanLamp => ({
  id,
  name: id,
  x: houseX + HOUSE_SHIFT,
  y: (houseY * MAP_HOUSE_HEIGHT) / PLAN_HOUSE.height,
  on: true,
  reachable: true,
  ...over,
})

const unit = (id: string, over: Partial<AcUnit> = {}): AcUnit => ({ id, name: id, reachable: true, power: true, ...over }) as AcUnit

/** L'état des volets de la maison : un volet par nom, avec son dernier ordre. */
const shuttersOf = (commands: Record<string, ShutterCommand | null>): ShuttersState => ({
  mock: false,
  shutters: Object.entries(commands).map(([name, lastCommand], index) => ({ id: `s${index + 1}`, name, lastCommand, lastAt: null, auto: null })),
})

beforeEach(() => {
  h.supported = true
  h.mobile = false
  h.frameId = 0
  h.lamps = []
  h.toggle = vi.fn()
  h.units = null
  h.change = vi.fn()
  h.shutters = null
  h.send = vi.fn()
  h.weather = { isDay: true, code: 0 }
  h.plug = null
  h.setPlug = vi.fn(() => Promise.resolve())
  h.sensors = []
  // L'état des caméras n'arrive pas, sauf dans les tests qui le donnent.
  h.power = vi.fn(() => new Promise<CameraPower[]>(() => undefined))
  h.noBlink = false
  h.shots.length = 0
  delete document.documentElement.dataset.theme
  localStorage.clear()
  // Presque tous les tests regardent le jour qui entre vraiment : le choix « Heure actuelle » (au départ, la vue est sur « Jour »).
  localStorage.setItem(LIGHT_KEY, 'now')
  for (const list of [h.planKeys, h.renderers, h.controls, h.parts, h.qualities, h.resize, h.visibility, h.disconnected, h.frames, h.cancelled]) list.length = 0
  stubCanvasContext(null)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        h.resize.push(callback)
      }
      observe = () => undefined
      disconnect = () => h.disconnected.push('resize')
    },
  )
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        h.visibility.push(callback)
      }
      observe = () => undefined
      disconnect = () => h.disconnected.push('visibility')
    },
  )
  // Les images demandées attendent dans `h.frames` : `frame()` fait passer la suivante, comme le navigateur.
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    h.frames.push(callback)
    h.frameId += 1
    return h.frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => h.cancelled.push(id))
})

/** Fait passer la prochaine image demandée (il en faut une en attente). */
const frame = () => {
  const next = h.frames.shift()
  if (!next) throw new Error('aucune image demandée')
  act(() => next())
}
/** Le nombre d'images dessinées depuis l'ouverture : chacune finit par la passe de la maison, à l'écran (voir `layers.ts`). */
const drawn = () => h.shots.filter((shot) => shot.mask === 1 << INDOOR && !shot.screen).length
/** Toutes les couches : ce que voit la passe qui refait l'ombre du soleil, et l'œil d'une caméra de la scène. */
const ALL_LAYERS = (() => {
  const layers = new THREE.Layers()
  layers.enableAll()
  return layers.mask
})()

const host = () => screen.getByRole('img')
const camera = () => h.controls[0].object
const canvas = () => h.renderers[0].domElement
const root = () => h.parts[0].root
const lightsOf = (parts: SceneParts) => {
  const lights: THREE.PointLight[] = []
  parts.root.traverse((child) => {
    // Les lampes de la maison : sans portée (celles qui sortent par les fenêtres et les LED des caméras en ont une).
    if ((child as THREE.PointLight).isPointLight && (child as THREE.PointLight).distance === 0) lights.push(child as THREE.PointLight)
  })
  return lights
}
/** Les lumières qui sortent par les fenêtres (`spill.ts`) : celles du dehors, de 5 m de portée. */
const spillOf = () => {
  const lights: THREE.PointLight[] = []
  root().traverse((child) => {
    if ((child as THREE.PointLight).isPointLight && (child as THREE.PointLight).distance === 5) lights.push(child as THREE.PointLight)
  })
  return lights
}
/** Tous les objets de la scène marqués par `userData[tag]`. */
const allTagged = (tag: string): THREE.Mesh[] => {
  const found: THREE.Mesh[] = []
  root().traverse((child) => {
    if (child.userData[tag] !== undefined) found.push(child as THREE.Mesh)
  })
  return found
}
/** Les trois cercles qui entourent un objet en vue Matrix (un groupe de trois boucles), et leur couleur. */
const ringsOf = (object: THREE.Object3D) => object.children.find((child) => child.children.length === 3 && child.children.every((part) => (part as THREE.LineLoop).isLineLoop)) as THREE.Group
const ringColor = (object: THREE.Object3D) => ((ringsOf(object).children[0] as THREE.LineLoop).material as THREE.LineBasicMaterial).color.getHex()
/** Laisse passer les promesses en attente (une réponse de la maison). */
const settle = () => act(async () => Promise.resolve())

/** L'objet de la scène marqué par `userData[tag] === value`. */
const tagged = (tag: string, value: unknown): THREE.Mesh => {
  let found: THREE.Object3D | null = null
  root().traverse((child) => {
    if (child.userData[tag] === value) found = child
  })
  if (!found) throw new Error(`rien n'est marqué ${tag} = ${String(value)}`)
  return found as THREE.Mesh
}

const worldOf = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3())

/** Place l'œil en `from` et le tourne vers `at` : le milieu de la vue vise `at` (les places de la scène sont remises à jour, comme le ferait un rendu). */
const look = (from: THREE.Vector3, at: THREE.Vector3) => {
  root().updateMatrixWorld(true)
  const eye = camera()
  eye.position.copy(from)
  eye.lookAt(at)
  eye.updateMatrixWorld(true)
}

/** Vise un objet depuis un point décalé de `offset` par rapport à lui. */
const aim = (target: THREE.Object3D, offset: [number, number, number]) => {
  const at = worldOf(target)
  look(at.clone().add(new THREE.Vector3(...offset)), at)
}

/** Regarde le ciel : rien de la scène n'est sous le pointeur. */
const lookAway = () => look(new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, 100, 5))

/** Un événement du pointeur sur la vue, au milieu par défaut (la vue fait 1000 × 520 px). */
const pointer = (type: string, init: MouseEventInit = {}) => {
  vi.spyOn(canvas(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 520 } as DOMRect)
  act(() => {
    canvas().dispatchEvent(new MouseEvent(type, { clientX: 500, clientY: 260, button: 0, buttons: 0, bubbles: true, ...init }))
  })
}

const click = () => {
  pointer('pointerdown')
  pointer('pointerup')
}

describe('Kitchen3D', () => {
  it('sans WebGL : un message, aucune scène', () => {
    h.supported = false
    render(<Kitchen3D apiKey="k" />)
    expect(screen.getByText(NO_WEBGL_TEXT)).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(h.renderers).toHaveLength(0)
    expect(h.parts).toHaveLength(0)
  })

  it('crée la scène une fois, la caméra à sa place de départ, et la dessine', () => {
    const view = render(<Kitchen3D apiKey="k" />)
    expect(screen.getByRole('heading')).toHaveTextContent('3D')
    expect(h.renderers).toHaveLength(1)
    const [renderer] = h.renderers
    expect(host()).toContainElement(renderer.domElement)
    expect(host().style.height).toBe(`${VIEW_HEIGHT}px`)
    expect(renderer.shadowMap.enabled).toBe(true)
    expect(camera().position.toArray()).toEqual([START.x, START.y, START.z])
    expect(h.controls[0].target.toArray()).toEqual([TARGET.x, TARGET.y, TARGET.z])
    expect(h.controls[0].domElement).toBe(renderer.domElement)
    expect(h.controls[0].enableDamping).toBe(true)
    // Le clic molette tourne la vue, comme le clic gauche.
    expect(h.controls[0].mouseButtons.MIDDLE).toBe(0)
    // L'ombre du soleil n'est refaite que sur demande.
    expect(renderer.shadowMap.autoUpdate).toBe(false)
    // Une première image est demandée, puis dessinée, avec l'ombre du soleil.
    expect(renderer.render).not.toHaveBeenCalled()
    expect(h.frames).toHaveLength(1)
    frame()
    // Trois passes : l'ombre du soleil (toutes couches vues), puis le jardin, puis la maison par-dessus, sans effacer.
    expect(h.shots).toEqual([
      { mask: ALL_LAYERS, screen: false, stale: true, autoClear: true },
      { mask: 1 << OUTDOOR, screen: false, stale: false, autoClear: true },
      { mask: 1 << INDOOR, screen: false, stale: false, autoClear: false },
    ])
    expect(renderer.autoClear).toBe(true)
    expect(drawn()).toBe(1)
    const [scene, shot] = renderer.render.mock.calls[0] as unknown as [THREE.Scene, THREE.Camera]
    expect(shot).toBe(camera())
    expect(scene.children[0]).toBe(h.parts[0].root)
    const sky = scene.children.filter((child) => (child as THREE.Light).isLight)
    expect(sky).toHaveLength(2)
    // L'ambiance et le soleil éclairent la maison et le jardin.
    for (const light of sky) expect(light.layers.mask).toBe((1 << INDOOR) | (1 << OUTDOOR))
    // Le jardin est dans sa couche, la maison dans la sienne.
    expect(h.parts[0].root.children[2].layers.mask).toBe(1 << OUTDOOR)
    expect(h.parts[0].root.children[0].layers.mask).toBe(1 << INDOOR)
    // Au repos : plus aucune image n'est demandée, rien ne tourne.
    expect(h.frames).toHaveLength(0)
    // Un nouveau rendu du composant ne recrée rien.
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(h.renderers).toHaveLength(1)
    expect(h.planKeys.at(-1)).toBe('k l1 true')
  })

  it('pas de rendu quand la vue est hors de l’écran ; à son retour, une image', () => {
    render(<Kitchen3D apiKey="k" />)
    frame()
    expect(drawn()).toBe(1)
    act(() => h.visibility[0]([{ isIntersecting: false }]))
    expect(h.frames).toHaveLength(0)
    // Ce qui change pendant ce temps demande une image, qui ne dessine rien.
    act(() => h.controls[0].move())
    frame()
    expect(drawn()).toBe(1)
    expect(h.controls[0].update).toHaveBeenCalledTimes(2)
    expect(h.frames).toHaveLength(0)
    // De retour à l'écran : une image, qui montre ce qui a changé.
    act(() => h.visibility[0]([{ isIntersecting: true }]))
    frame()
    expect(drawn()).toBe(2)
    expect(h.frames).toHaveLength(0)
  })

  it('suit la largeur de son bloc ; une largeur nulle est ignorée', () => {
    render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    expect(renderer.setSize).not.toHaveBeenCalled()
    Object.defineProperty(host(), 'clientWidth', { value: 1040, configurable: true })
    act(() => h.resize[0]())
    expect(renderer.setSize).toHaveBeenCalledExactlyOnceWith(1040, VIEW_HEIGHT)
    expect(camera().aspect).toBe(1040 / VIEW_HEIGHT)
    // La vue redimensionnée est redessinée.
    frame()
    expect(drawn()).toBe(1)
    act(() => h.resize[0]())
    frame()
    expect(drawn()).toBe(2)
    expect(h.frames).toHaveLength(0)
  })

  it('les boutons : la vue du dessus et le retour à la vue de départ ; ni « Hotte » ni « Volets réels » (la hotte est toujours là)', () => {
    render(<Kitchen3D apiKey="k" />)
    // (Plus de bouton « Vent ».)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Vue du dessus', 'Réinitialiser la vue', 'Vue Matrix'])
    expect(h.parts[0].hood.visible).toBe(true)
    frame()
    fireEvent.click(screen.getByRole('button', { name: 'Vue du dessus' }))
    expect(camera().position.toArray()).toEqual([TOP.x, TOP.y, TOP.z])
    // Chaque changement de vue est dessiné.
    frame()
    expect(drawn()).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser la vue' }))
    expect(camera().position.toArray()).toEqual([START.x, START.y, START.z])
    frame()
    expect(drawn()).toBe(3)
    expect(h.renderers).toHaveLength(1)
  })

  it('le clic molette ne lance pas le défilement automatique du navigateur', () => {
    render(<Kitchen3D apiKey="k" />)
    expect(fireEvent.mouseDown(host(), { button: 1 })).toBe(false)
    expect(fireEvent.mouseDown(host(), { button: 0 })).toBe(true)
  })

  it('les lampes Hue de l’espace de vie éclairent la scène, à chaque changement', () => {
    h.lamps = [
      lamp('plan-cuisine', 300, 70, { brightness: 127, color: '#ff8800' }),
      lamp('plan-salon', 300, 220, { on: false }),
      lamp('a-placer', 300, 70, { waiting: true }),
      lamp('plan-chambre', 100, 100),
    ]
    const view = render(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('1 lampe allumée sur 2 dans la pièce')).toBeInTheDocument()
    const lights = lightsOf(h.parts[0])
    expect(lights.map((light) => light.intensity)).toEqual([expect.closeTo((127 / 254) * LAMP_LIGHT.intensity), 0])
    // Une lampe éteinte ne compte pas dans le rendu : sa source est cachée.
    expect(lights.map((light) => light.visible)).toEqual([true, false])
    expect(lights[0].color.getHexString()).toBe('ff8800')
    frame()
    expect(drawn()).toBe(1)
    expect(h.frames).toHaveLength(0)
    // La lampe du salon s'allume, sans couleur ni luminosité : blanc chaud, pleine puissance.
    h.lamps = [h.lamps[0], lamp('plan-salon', 300, 220), h.lamps[2], h.lamps[3]]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('2 lampes allumées sur 2 dans la pièce')).toBeInTheDocument()
    expect(lightsOf(h.parts[0]).map((light) => light.intensity)).toEqual([expect.closeTo((127 / 254) * LAMP_LIGHT.intensity), LAMP_LIGHT.intensity])
    expect(lightsOf(h.parts[0]).map((light) => light.visible)).toEqual([true, true])
    // Le changement est dessiné, une fois ; l'ombre du soleil n'est pas refaite (les lampes n'en portent pas).
    frame()
    expect(drawn()).toBe(2)
    expect(h.renderers[0].shadowMap.needsUpdate).toBe(false)
    expect(h.frames).toHaveLength(0)
    // Une relecture du pont sans changement ne redessine rien.
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(h.frames).toHaveLength(0)
    // Une lampe injoignable n'éclaire pas ; une lampe retirée du pont quitte la scène.
    h.lamps = [lamp('plan-cuisine', 300, 70, { reachable: false })]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('0 lampe allumée sur 1 dans la pièce')).toBeInTheDocument()
    expect(lightsOf(h.parts[0]).map((light) => light.intensity)).toEqual([0])
    expect(lightsOf(h.parts[0]).map((light) => light.visible)).toEqual([false])
    expect(h.renderers).toHaveLength(1)
  })

  it('une lampe dont le luminaire est nommé dans la scène y est, même hors de l’espace de vie ou sans place sur le plan', () => {
    h.lamps = [lamp('l1', 100, 100, { name: 'Chambre' }), lamp('l2', 300, 70, { name: ' Couloir ', waiting: true }), lamp('l3', 100, 100, { name: 'Garage' })]
    render(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('2 lampes allumées sur 2 dans la pièce')).toBeInTheDocument()
    const [bedroom, corridor] = lightsOf(h.parts[0])
    // La lumière part de leur luminaire, un peu sous l'ampoule.
    const under = (name: string) => worldOf(tagged('fixtureName', name)).add(new THREE.Vector3(0, -0.12, 0))
    expect(bedroom.position.distanceTo(under('chambre'))).toBeCloseTo(0)
    expect(corridor.position.distanceTo(under('couloir'))).toBeCloseTo(0)
  })

  it('au démontage : la boucle s’arrête, tout est libéré et le contexte WebGL est rendu', () => {
    h.lamps = [lamp('l1', 0, 0, { name: 'Salon' })]
    const view = render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    const drawing = renderer.domElement
    const floor = (h.parts[0].root.getObjectByName('static') as THREE.Group).children[0] as THREE.Mesh
    const dispose = vi.spyOn(floor.geometry, 'dispose')
    const element = host()
    aim(tagged('fixtureName', 'salon'), [1, -0.5, 1])
    view.unmount()
    expect(h.cancelled).toEqual([1])
    expect(h.disconnected.sort()).toEqual(['resize', 'visibility'])
    expect(h.controls[0].dispose).toHaveBeenCalledTimes(1)
    expect(h.controls[0].listeners.size).toBe(0)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1)
    expect(drawing.isConnected).toBe(false)
    // L'écouteur du clic molette est retiré, ceux du pointeur aussi.
    expect(fireEvent.mouseDown(element, { button: 1 })).toBe(true)
    click()
    expect(h.toggle).not.toHaveBeenCalled()
  })
})

describe('Kitchen3D : le pointeur', () => {
  it('devient une main au-dessus d’une ampoule, d’une clim ou d’une fenêtre à volet', () => {
    h.lamps = [lamp('l1', 0, 0, { name: 'Salon' })]
    render(<Kitchen3D apiKey="k" />)
    lookAway()
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('')
    aim(tagged('fixtureName', 'salon'), [1, -0.5, 1])
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('pointer')
    lookAway()
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('')
    aim(tagged('acUnit', 'chambre-invite'), [-1.5, 0, 0])
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('pointer')
    // Pendant qu'on glisse (un bouton enfoncé), le curseur ne change pas.
    lookAway()
    pointer('pointermove', { buttons: 1 })
    expect(canvas().style.cursor).toBe('pointer')
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('')
    aim(tagged('shutter', 'cuisine'), [-1.5, 0, 0])
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('pointer')
  })

  it('un clic sans glisser sur une ampoule allume ou éteint sa lampe', () => {
    h.lamps = [lamp('l1', 0, 0, { name: 'Salon' })]
    render(<Kitchen3D apiKey="k" />)
    aim(tagged('fixtureName', 'salon'), [1, -0.5, 1])
    click()
    expect(h.toggle).toHaveBeenCalledExactlyOnceWith('l1')
    // Glisser (tourner la vue) n'est pas cliquer ; un autre bouton non plus ; ni un relâchement sans appui.
    pointer('pointerdown')
    pointer('pointerup', { clientX: 520 })
    pointer('pointerdown', { button: 2 })
    pointer('pointerup', { button: 2 })
    pointer('pointerup')
    expect(h.toggle).toHaveBeenCalledTimes(1)
    // Un tremblement de quelques pixels reste un clic.
    pointer('pointerdown')
    pointer('pointerup', { clientX: 503, clientY: 257 })
    expect(h.toggle).toHaveBeenCalledTimes(2)
  })

  it('la scène appelle toujours le `toggle` du moment', () => {
    h.lamps = [lamp('l1', 0, 0, { name: 'Salon' })]
    const view = render(<Kitchen3D apiKey="k" />)
    const first = h.toggle
    h.toggle = vi.fn()
    view.rerender(<Kitchen3D apiKey="k" />)
    aim(tagged('fixtureName', 'salon'), [1, -0.5, 1])
    click()
    expect(first).not.toHaveBeenCalled()
    expect(h.toggle).toHaveBeenCalledExactlyOnceWith('l1')
  })

  it('un clic dans le vide ne fait rien', () => {
    h.units = [unit('salon')]
    h.shutters = shuttersOf({ 'Volet cuisine': 'up' })
    render(<Kitchen3D apiKey="k" />)
    lookAway()
    click()
    expect(h.toggle).not.toHaveBeenCalled()
    expect(h.change).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })
})

describe('Kitchen3D : les clims', () => {
  it('un clic sur une clim l’allume ou l’éteint', () => {
    h.units = [unit('salon'), unit('chambre-invite', { power: false })]
    render(<Kitchen3D apiKey="k" />)
    aim(tagged('acUnit', 'salon'), [0, -0.5, -2])
    click()
    expect(h.change).toHaveBeenCalledExactlyOnceWith('salon', { on: false })
    aim(tagged('acUnit', 'chambre-invite'), [-1.5, 0, 0])
    click()
    expect(h.change).toHaveBeenLastCalledWith('chambre-invite', { on: true })
  })

  it('sans état connu (pas encore lue, injoignable, absente) : le clic ne fait rien', () => {
    const view = render(<Kitchen3D apiKey="k" />)
    aim(tagged('acUnit', 'salon'), [0, -0.5, -2])
    click()
    h.units = [unit('salon', { reachable: false }), unit('matou')]
    view.rerender(<Kitchen3D apiKey="k" />)
    click()
    aim(tagged('acUnit', 'chambre-invite'), [-1.5, 0, 0])
    click()
    expect(h.change).not.toHaveBeenCalled()
  })

  it('le voyant de chaque clim suit la vraie : gris, vert, rouge', () => {
    const colorOf = (id: string) => (tagged('acLed', id).material as THREE.MeshBasicMaterial).color.getHex()
    const view = render(<Kitchen3D apiKey="k" />)
    expect([colorOf('salon'), colorOf('chambre-invite')]).toEqual([AC_LED.unknown, AC_LED.unknown])
    h.units = [unit('salon'), unit('chambre-invite', { power: false })]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect([colorOf('salon'), colorOf('chambre-invite')]).toEqual([AC_LED.on, AC_LED.off])
    // Le voyant qui change est dessiné.
    expect(h.frames).toHaveLength(1)
    frame()
    expect(drawn()).toBe(1)
    expect(h.frames).toHaveLength(0)
    h.units = [unit('salon', { reachable: false }), unit('chambre-invite')]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect([colorOf('salon'), colorOf('chambre-invite')]).toEqual([AC_LED.unknown, AC_LED.on])
  })
})

describe('Kitchen3D : les caméras', () => {
  it('un clic sur une caméra de la scène ouvre la vraie ; la souris devient une main au-dessus', () => {
    const onOpenCamera = vi.fn()
    render(<Kitchen3D apiKey="k" onOpenCamera={onOpenCamera} />)
    aim(tagged('camera', 'voliere-toit'), [0.2, 2, 0.2])
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('pointer')
    click()
    expect(onOpenCamera).toHaveBeenCalledExactlyOnceWith('voliere-toit')
    aim(tagged('camera', 'salon-de-jardin'), [0.2, 2, 0.2])
    click()
    expect(onOpenCamera).toHaveBeenLastCalledWith('salon-de-jardin')
    expect(h.change).not.toHaveBeenCalled()
    expect(h.send).not.toHaveBeenCalled()
  })

  it('deux modèles sur le même rayon : le clic ouvre celui de devant, dans un sens comme dans l’autre', () => {
    const onOpenCamera = vi.fn()
    render(<Kitchen3D apiKey="k" onOpenCamera={onOpenCamera} />)
    const names = ['voliere-toit', 'salon-de-jardin']
    for (const [front, back] of [names, [...names].reverse()]) {
      const behind = tagged('camera', back)
      const ahead = tagged('camera', front)
      // Le modèle de devant est une copie de celui de derrière, rapprochée de l'œil le long du rayon.
      aim(behind, [0.2, 2, 0.2])
      const eye = camera().position.clone()
      const at = worldOf(behind)
      const quaternion = behind.getWorldQuaternion(new THREE.Quaternion())
      root().add(ahead)
      ahead.quaternion.copy(quaternion)
      ahead.position.copy(at).addScaledVector(eye.clone().sub(at).normalize(), 0.5)
      aim(behind, [0.2, 2, 0.2])
      click()
      expect(onOpenCamera).toHaveBeenLastCalledWith(front)
    }
  })

  it('sans `onOpenCamera`, le clic sur une caméra ne fait rien', () => {
    render(<Kitchen3D apiKey="k" />)
    aim(tagged('camera', 'voliere-toit'), [0.2, 2, 0.2])
    click()
    expect(h.send).not.toHaveBeenCalled()
  })
})

describe('Kitchen3D : la molette et la vue Matrix', () => {
  const wheel = (deltaY: number) => {
    vi.spyOn(canvas(), 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 520 } as DOMRect)
    const event = new WheelEvent('wheel', { clientX: 500, clientY: 260, deltaY, bubbles: true, cancelable: true })
    act(() => {
      canvas().dispatchEvent(event)
    })
    return event
  }

  it('la molette avance la caméra d’un pas fixe vers le pointeur, le pivot avec elle, sans limite de zoom', () => {
    render(<Kitchen3D apiKey="k" />)
    frame()
    const [controls] = h.controls
    expect(controls.minDistance).toBe(0)
    expect(controls.maxDistance).toBe(Infinity)
    const before = camera().position.clone()
    const pivot = controls.target.clone()
    const event = wheel(-100)
    expect(event.defaultPrevented).toBe(true)
    // Le pas est le même, quelle que soit la distance : une encoche = WHEEL_STEP.
    expect(camera().position.distanceTo(before)).toBeCloseTo(WHEEL_STEP)
    expect(controls.target.distanceTo(pivot)).toBeCloseTo(WHEEL_STEP)
    // Le zoom est dessiné.
    expect(h.frames).toHaveLength(1)
    frame()
    // Vers l'arrière : le même pas dans l'autre sens ; un grand coup de molette vaut au plus trois pas.
    const forward = camera().position.clone()
    wheel(100)
    expect(camera().position.distanceTo(forward)).toBeCloseTo(WHEEL_STEP)
    expect(camera().position.distanceTo(before)).toBeCloseTo(0)
    wheel(5000)
    expect(camera().position.distanceTo(before)).toBeCloseTo(3 * WHEEL_STEP)
    // Aucun cran : rien ne bouge.
    const still = camera().position.clone()
    wheel(0)
    expect(camera().position.distanceTo(still)).toBe(0)
  })

  it('à la fermeture, la molette n’est plus écoutée', () => {
    const view = render(<Kitchen3D apiKey="k" />)
    const target = canvas()
    const remove = vi.spyOn(target, 'removeEventListener')
    view.unmount()
    expect(remove).toHaveBeenCalledWith('wheel', expect.any(Function), { capture: true })
  })

  it('le bouton Matrix passe à la vue en arêtes sur fond noir, et revient à la vue normale', () => {
    render(<Kitchen3D apiKey="k" />)
    frame()
    const edges = () => {
      const lines: THREE.LineSegments[] = []
      root().traverse((child) => {
        if ((child as THREE.LineSegments).isLineSegments && child.visible) lines.push(child as THREE.LineSegments)
      })
      return lines
    }
    expect(edges()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: MATRIX_LABEL.on }))
    expect(screen.getByRole('button', { name: MATRIX_LABEL.off })).toBeInTheDocument()
    // (Thème clair de la page, par défaut : fond clair.)
    expect(h.renderers[0].setClearColor).toHaveBeenLastCalledWith(MATRIX_LIGHT.background, 1)
    expect(edges().length).toBeGreaterThan(0)
    // Le changement de vue est dessiné, ombre comprise.
    expect(h.frames).toHaveLength(1)
    frame()
    expect(drawn()).toBe(2)
    fireEvent.click(screen.getByRole('button', { name: MATRIX_LABEL.off }))
    expect(screen.getByRole('button', { name: MATRIX_LABEL.on })).toBeInTheDocument()
    expect(h.renderers[0].setClearColor).toHaveBeenLastCalledWith(MATRIX_LIGHT.background, 0)
    expect(edges()).toHaveLength(0)
  })
})

describe('Kitchen3D : les volets et le jour', () => {
  const slatsOf = (key: string) => tagged('shutter', key)
  const shownOf = (key: string) => slatsOf(key).children.filter((slat) => slat.visible).length
  const lightsOfScene = () => {
    const scene = root().parent as THREE.Scene
    const ambient = scene.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight
    const sun = scene.children.find((child) => (child as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight
    return { ambient, sun }
  }

  it('les volets de la scène suivent ceux de la maison ; sans état connu, ils sont à moitié', () => {
    const view = render(<Kitchen3D apiKey="k" />)
    for (const key of SHUTTER_KEYS) expect(shownOf(key)).toBe(Math.round(slatsOf(key).children.length / 2))
    h.shutters = shuttersOf({ 'Volet cuisine': 'down', 'Volet Salon': 'up', 'Volet PC': 'stop', 'Volet porte': null })
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(shownOf('cuisine')).toBe(slatsOf('cuisine').children.length)
    expect(shownOf('salon')).toBe(0)
    expect(shownOf('pc')).toBe(Math.round(slatsOf('pc').children.length / 2))
    expect(shownOf('porte')).toBe(Math.round(slatsOf('porte').children.length / 2))
  })

  it('le jour qui entre : la part de vitre découverte, fois la clarté du ciel', () => {
    h.shutters = shuttersOf({ 'Volet cuisine': 'down', 'Volet salon': 'down', 'Volet PC': 'down', 'Volet porte': 'down' })
    const view = render(<Kitchen3D apiKey="k" />)
    const { ambient, sun } = lightsOfScene()
    // Tout fermé : il ne reste que l'ambiance de nuit.
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night)
    expect(sun.intensity).toBe(0)
    // Un soleil éteint est caché : il ne compte ni dans le rendu ni dans la carte d'ombre.
    expect(sun.visible).toBe(false)
    frame()
    expect(h.frames).toHaveLength(0)
    // Tout ouvert : plein jour.
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'up', 'Volet PC': 'up', 'Volet porte': 'up' })
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(shownOf('cuisine')).toBe(0)
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun)
    expect(sun.visible).toBe(true)
    // Les lames ont bougé et le soleil revient : une image, avec l'ombre refaite.
    expect(h.renderers[0].shadowMap.needsUpdate).toBe(false)
    const stale: boolean[] = []
    h.renderers[0].render.mockImplementationOnce(() => {
      stale.push(h.renderers[0].shadowMap.needsUpdate)
    })
    frame()
    expect(stale).toEqual([true])
    expect(h.frames).toHaveLength(0)
    // Le ciel se couvre, puis la nuit tombe.
    h.weather = { isDay: true, code: 3 }
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day * 0.7)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun * 0.7)
    h.weather = { isDay: false, code: 0 }
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night)
  })

  it('« Jour » : la scène est éclairée comme en journée, volets fermés et de nuit compris ; les volets suivent quand même la maison', () => {
    localStorage.setItem(LIGHT_KEY, 'day')
    h.weather = { isDay: false, code: 3 }
    h.shutters = shuttersOf({ 'Volet cuisine': 'down', 'Volet salon': 'down', 'Volet PC': 'down', 'Volet porte': 'down' })
    render(<Kitchen3D apiKey="k" />)
    const { ambient, sun } = lightsOfScene()
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun)
    expect(shownOf('cuisine')).toBe(slatsOf('cuisine').children.length)
  })

  it('un clic sur une fenêtre envoie l’ordre contraire du dernier à son volet', () => {
    h.shutters = shuttersOf({ 'Volet cuisine': 'down', 'Volet salon': 'up', 'Volet porte': 'stop' })
    render(<Kitchen3D apiKey="k" />)
    aim(slatsOf('cuisine'), [-1.5, 0, 0])
    click()
    expect(h.send).toHaveBeenCalledExactlyOnceWith('s1', 'up')
    aim(slatsOf('salon'), [1.5, 0, 0])
    click()
    expect(h.send).toHaveBeenLastCalledWith('s2', 'down')
    // Le long du mur des baies, deux fenêtres sont sous le pointeur : c'est la plus proche de l'œil, la porte-fenêtre.
    const wallX = worldOf(slatsOf('porte')).x + 0.03
    look(new THREE.Vector3(wallX, 1.5, ROOM.zMin - 1.5), new THREE.Vector3(wallX, 1.5, 10))
    click()
    expect(h.send).toHaveBeenLastCalledWith('s3', 'down')
    // De l'autre bout du mur, la fenêtre du bureau d'abord : elle n'a pas de volet connu de la maison.
    look(new THREE.Vector3(wallX, 1.5, ROOM.zMax + 1), new THREE.Vector3(wallX, 1.5, -10))
    click()
    expect(h.send).toHaveBeenCalledTimes(3)
  })

  it('sans état des volets, un clic sur une fenêtre ne fait rien', () => {
    render(<Kitchen3D apiKey="k" />)
    aim(slatsOf('cuisine'), [-1.5, 0, 0])
    click()
    expect(h.send).not.toHaveBeenCalled()
  })

  it('seul un volet cliqué bouge à l’écran : ses lames avancent du temps écoulé ; passé le délai, les volets se placent d’un coup', () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    h.shutters = shuttersOf({ 'Volet cuisine': 'down' })
    const view = render(<Kitchen3D apiKey="k" />)
    const slats = slatsOf('cuisine')
    expect(slats.userData.level).toBe(1)
    aim(slats, [-1.5, 0, 0])
    click()
    expect(h.send).toHaveBeenCalledExactlyOnceWith('s1', 'up')
    // La maison confirme l'ordre : le volet garde sa place et monte peu à peu.
    h.shutters = shuttersOf({ 'Volet cuisine': 'up' })
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(slats.userData).toMatchObject({ goal: 0, level: 1 })
    // (L'image de l'ouverture n'est pas encore passée : elle sert de premier pas.)
    expect(h.frames).toHaveLength(1)
    now += 100
    frame()
    expect(slats.userData.level).toBeCloseTo(1 - 0.1 / SHUTTER_TRAVEL_S)
    expect(drawn()).toBe(1)
    // Tant qu'il bouge, la boucle continue ; une image n'est dessinée que si une lame a disparu (son ombre est alors refaite).
    expect(h.frames).toHaveLength(1)
    const before = shownOf('cuisine')
    now += 10
    frame()
    expect(shownOf('cuisine')).toBe(before)
    expect(drawn()).toBe(1)
    // Après une pause de l'onglet, un pas d'un quart de seconde au plus.
    now += 60_000
    const stale: boolean[] = []
    h.renderers[0].render.mockImplementationOnce(() => {
      stale.push(h.renderers[0].shadowMap.needsUpdate)
    })
    frame()
    expect(slats.userData.level).toBeCloseTo(1 - 0.36 / SHUTTER_TRAVEL_S)
    expect(shownOf('cuisine')).toBe(before - 1)
    expect(drawn()).toBe(2)
    expect(stale).toEqual([true])
    // Hors de l'écran, le volet continue sa course, sans rien dessiner.
    act(() => h.visibility[0]([{ isIntersecting: false }]))
    now += 250
    frame()
    expect(slats.userData.level).toBeCloseTo(1 - 0.61 / SHUTTER_TRAVEL_S)
    expect(drawn()).toBe(2)
    expect(h.frames).toHaveLength(1)
    act(() => h.visibility[0]([{ isIntersecting: true }]))
    // Le délai d'animation est passé : un changement venu d'ailleurs se place d'un coup.
    expect(now).toBeGreaterThan(1000 + SHUTTER_ANIMATE_MS)
    h.shutters = shuttersOf({ 'Volet cuisine': 'down' })
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(slats.userData.level).toBe(1)
    expect(shownOf('cuisine')).toBe(slats.children.length)
    // Arrivé : une dernière image, puis plus rien ne tourne.
    frame()
    expect(h.frames).toHaveLength(0)
  })
})

describe('Kitchen3D : l’heure', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('la pendule de la cuisine donne l’heure, remise à jour toutes les quinze secondes', () => {
    // (Les images demandées restent celles du test : seuls l'horloge et ses minuteries sont simulées.)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date(2026, 10, 26, 9, 0, 0))
    const view = render(<Kitchen3D apiKey="k" />)
    const hour = tagged('clockHand', 'hour')
    const minute = tagged('clockHand', 'minute')
    expect(hour.rotation.z).toBeCloseTo((9 / 12) * Math.PI * 2)
    expect(minute.rotation.z).toBeCloseTo(0)
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(minute.rotation.z).toBeCloseTo((0.5 / 60) * Math.PI * 2)
    // Chaque pas de la pendule est dessiné, avec l'ombre de ses aiguilles ; entre deux, rien ne tourne.
    frame()
    expect(drawn()).toBe(1)
    expect(h.frames).toHaveLength(0)
    const stale: boolean[] = []
    h.renderers[0].render.mockImplementationOnce(() => {
      stale.push(h.renderers[0].shadowMap.needsUpdate)
    })
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    frame()
    expect(stale).toEqual([true])
    expect(h.frames).toHaveLength(0)
    // Démontée, la pendule s'arrête.
    view.unmount()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(minute.rotation.z).toBeCloseTo((0.75 / 60) * Math.PI * 2)
    expect(h.frames).toHaveLength(0)
  })

  it('sans météo, le jour qui entre suit l’heure, relue avec la pendule : jour moyen à midi, nuit à 22 h', () => {
    h.weather = null
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'up', 'Volet PC': 'up', 'Volet porte': 'up' })
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 26, 12, 0, 0))
    render(<Kitchen3D apiKey="k" />)
    const scene = root().parent as THREE.Scene
    const ambient = scene.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day * 0.7)
    // La pendule avance (toutes les 15 s) sans que l'heure change : rien ne bouge.
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day * 0.7)
    // À 22 h, au prochain pas de la pendule : la nuit.
    vi.setSystemTime(new Date(2026, 10, 26, 22, 0, 0))
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night)
  })
})

describe('Kitchen3D : la lumière', () => {
  const sceneOf = () => root().parent as THREE.Scene
  const selected = (group: string) => screen.getByRole('tablist', { name: group }).querySelector('[aria-selected="true"]')?.textContent
  const pick = (name: string) => fireEvent.click(screen.getByRole('tab', { name }))
  const lights = () => {
    const ambient = sceneOf().children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight
    const sun = sceneOf().children.find((child) => (child as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight
    return { ambient, sun }
  }

  it('au départ : « Jour », plein jour même de nuit et volets fermés ; un seul choix au-dessus de la vue, ni saison ni météo', () => {
    localStorage.clear()
    h.weather = { isDay: false, code: 3 }
    h.shutters = shuttersOf({ 'Volet cuisine': 'down', 'Volet salon': 'down', 'Volet PC': 'down', 'Volet porte': 'down' })
    render(<Kitchen3D apiKey="k" />)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Jour', 'Heure actuelle'])
    expect(selected('Lumière')).toBe('Jour')
    const { ambient, sun } = lights()
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun)
    expect(sun.visible).toBe(true)
    // Ni pluie ni neige dans la scène, pas de fond, et rien n'y est marqué d'une saison ou caché pour une autre.
    expect(sceneOf().children).toHaveLength(3)
    expect(sceneOf().background).toBeNull()
    root().traverse((child) => {
      expect(child.userData.season).toBeUndefined()
      expect(child.userData.snow).toBeUndefined()
    })
    // Rien ne bouge : la boucle s'arrête après la première image.
    frame()
    expect(drawn()).toBe(1)
    expect(h.frames).toHaveLength(0)
    // L'ancien choix de saison et de météo n'est plus lu ni écrit.
    expect(localStorage.getItem('house-garden-climate')).toBeNull()
  })

  it('« Heure actuelle » : le jour qui entre vraiment (la nuit, seules les lampes éclairent) ; le choix refait l’ombre et est gardé sur l’appareil', () => {
    localStorage.clear()
    h.weather = { isDay: false, code: 0 }
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'up', 'Volet PC': 'up', 'Volet porte': 'up' })
    const view = render(<Kitchen3D apiKey="k" />)
    const { ambient, sun } = lights()
    frame()
    expect(h.renderers[0].shadowMap.needsUpdate).toBe(false)
    pick('Heure actuelle')
    expect(selected('Lumière')).toBe('Heure actuelle')
    expect(localStorage.getItem(LIGHT_KEY)).toBe('now')
    // Il fait nuit : il ne reste que l'ambiance de nuit, le soleil est éteint et caché.
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night)
    expect(sun.intensity).toBe(0)
    expect(sun.visible).toBe(false)
    // Une image, avec l'ombre du soleil refaite ; puis plus rien.
    const stale: boolean[] = []
    h.renderers[0].render.mockImplementationOnce(() => {
      stale.push(h.renderers[0].shadowMap.needsUpdate)
    })
    frame()
    expect(drawn()).toBe(2)
    expect(stale).toEqual([true])
    expect(h.frames).toHaveLength(0)
    // La scène n'est pas reconstruite.
    expect(h.parts).toHaveLength(1)
    expect(h.renderers).toHaveLength(1)
    // Rouverte, la vue est comme on l'a laissée.
    view.unmount()
    for (const list of [h.parts, h.renderers, h.controls, h.frames]) list.length = 0
    render(<Kitchen3D apiKey="k" />)
    expect(selected('Lumière')).toBe('Heure actuelle')
    expect(lights().sun.visible).toBe(false)
    // Retour au plein jour.
    pick('Jour')
    expect(localStorage.getItem(LIGHT_KEY)).toBe('day')
    expect(lights().ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day)
    expect(lights().sun.intensity).toBeCloseTo(DAYLIGHT.sun)
    expect(lights().sun.visible).toBe(true)
  })
})

describe('Kitchen3D : le rendu à la demande', () => {
  it('la caméra bouge : une image par mouvement ; tant qu’elle finit sa course, les images se suivent, puis tout s’arrête', () => {
    render(<Kitchen3D apiKey="k" />)
    const [controls] = h.controls
    frame()
    expect(drawn()).toBe(1)
    expect(h.frames).toHaveLength(0)
    // Deux mouvements avant la prochaine image : une seule image demandée.
    act(() => controls.move())
    act(() => controls.move())
    expect(h.frames).toHaveLength(1)
    frame()
    expect(drawn()).toBe(2)
    expect(h.frames).toHaveLength(0)
    // On lâche la vue : l'amortissement la fait encore glisser pendant trois images.
    controls.settling = 3
    act(() => controls.move())
    for (let step = 0; step < 3; step += 1) {
      frame()
      expect(drawn()).toBe(3 + step)
      expect(h.frames).toHaveLength(1)
    }
    // Arrêtée : la dernière image demandée constate que rien n'a bougé, ne dessine rien et n'en demande pas d'autre.
    frame()
    expect(drawn()).toBe(5)
    expect(h.frames).toHaveLength(0)
    // L'ombre du soleil n'a pas été refaite pour autant.
    expect(h.renderers[0].shadowMap.needsUpdate).toBe(false)
  })

  it('une photo qui finit de se charger est montrée par une image de plus', () => {
    const loaded: (() => void)[] = []
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
      const texture = new THREE.Texture<HTMLImageElement>()
      loaded.push(() => onLoad?.(texture))
      return texture
    })
    const view = render(<Kitchen3D apiKey="k" />)
    expect(loaded.length).toBeGreaterThan(0)
    frame()
    expect(h.frames).toHaveLength(0)
    act(() => loaded[0]())
    frame()
    expect(drawn()).toBe(2)
    // Démontée, la vue n'écoute plus.
    view.unmount()
    h.frames.length = 0
    act(() => loaded[0]())
    expect(h.frames).toHaveLength(0)
  })

  it('le temps repart de maintenant après un repos : le premier pas d’un volet ne compte pas la pause', () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    h.shutters = shuttersOf({ 'Volet cuisine': 'down' })
    const view = render(<Kitchen3D apiKey="k" />)
    frame()
    expect(h.frames).toHaveLength(0)
    // Une minute de repos, puis un clic sur la fenêtre.
    now += 60_000
    const slats = tagged('shutter', 'cuisine')
    aim(slats, [-1.5, 0, 0])
    click()
    h.shutters = shuttersOf({ 'Volet cuisine': 'up' })
    view.rerender(<Kitchen3D apiKey="k" />)
    now += 16
    frame()
    expect(slats.userData.level).toBeCloseTo(1 - 0.016 / SHUTTER_TRAVEL_S)
  })
})

describe('Kitchen3D : la qualité selon l’appareil', () => {
  const sunOf = () => (root().parent as THREE.Scene).children.find((child) => (child as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight

  it('sur un bureau : la pleine qualité', () => {
    vi.stubGlobal('devicePixelRatio', 3)
    render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    expect(renderer.options).toEqual({ antialias: true, alpha: true })
    expect(renderer.setPixelRatio).toHaveBeenCalledExactlyOnceWith(2)
    expect(sunOf().shadow.mapSize.toArray()).toEqual([4096, 4096])
    expect(h.qualities).toEqual([QUALITY.desktop])
  })

  it('sur téléphone : la vue Matrix seule (pas de bouton pour en sortir), à la définition de l’écran, une carte d’ombre plus petite, moins d’herbe', () => {
    h.mobile = true
    vi.stubGlobal('devicePixelRatio', 3)
    render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    // Des traits, bien moins lourds que la scène pleine : lissés, deux pixels par pixel au plus.
    expect(renderer.options).toEqual({ antialias: true, alpha: true })
    expect(renderer.setPixelRatio).toHaveBeenCalledExactlyOnceWith(2)
    expect(QUALITY.phone.matrixOnly).toBe(true)
    expect(QUALITY.desktop.matrixOnly).toBe(false)
    // La scène s'ouvre en vue Matrix : fond opaque, arêtes montrées, et pas de bouton « Vue Matrix ».
    expect(renderer.setClearColor).toHaveBeenLastCalledWith(MATRIX_LIGHT.background, 1)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Vue du dessus', 'Réinitialiser la vue'])
    let edges = 0
    root().traverse((child) => {
      if ((child as THREE.LineSegments).isLineSegments && child.visible) edges += 1
    })
    expect(edges).toBeGreaterThan(100)
    expect(sunOf().shadow.mapSize.toArray()).toEqual([2048, 2048])
    expect(h.qualities).toEqual([QUALITY.phone])
    expect(QUALITY.phone.grass).toBeLessThan(1)
    expect(renderer.shadowMap.autoUpdate).toBe(false)
  })

  it('un écran moins dense que le plafond garde sa densité', () => {
    h.mobile = true
    vi.stubGlobal('devicePixelRatio', 0.75)
    render(<Kitchen3D apiKey="k" />)
    expect(h.renderers[0].setPixelRatio).toHaveBeenCalledExactlyOnceWith(0.75)
  })

  it('la qualité est choisie à l’ouverture : tourner le téléphone (ou rétrécir la fenêtre) ne reconstruit rien', () => {
    h.mobile = true
    const view = render(<Kitchen3D apiKey="k" />)
    h.mobile = false
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(h.renderers).toHaveLength(1)
    expect(h.qualities).toEqual([QUALITY.phone])
  })
})

describe('Kitchen3D : les couches et la lumière qui sort par les fenêtres', () => {
  it('une lampe allumée dans la maison éclaire un peu le jardin par les fenêtres aux volets ouverts ; volets fermés ou lampe éteinte, plus rien', () => {
    h.lamps = [lamp('l1', 0, 0, { name: 'Salon' })]
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'up', 'Volet PC': 'up', 'Volet porte': 'up' })
    const view = render(<Kitchen3D apiKey="k" />)
    // Une lumière du dehors par fenêtre à volet.
    expect(spillOf()).toHaveLength(SHUTTER_KEYS.length)
    for (const light of spillOf()) expect(light.layers.mask).toBe(1 << OUTDOOR)
    expect(spillOf().filter((light) => light.visible).length).toBeGreaterThan(0)
    // La lampe, elle, n'éclaire que la maison.
    expect(lightsOf(h.parts[0]).map((light) => light.layers.mask)).toEqual([1 << INDOOR])
    h.shutters = shuttersOf({ 'Volet cuisine': 'down', 'Volet salon': 'down', 'Volet PC': 'down', 'Volet porte': 'down' })
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(spillOf().filter((light) => light.visible)).toHaveLength(0)
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'up', 'Volet PC': 'up', 'Volet porte': 'up' })
    h.lamps = [lamp('l1', 0, 0, { name: 'Salon', on: false })]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(spillOf().filter((light) => light.visible)).toHaveLength(0)
  })
})

describe('Kitchen3D : les écrans', () => {
  const screens = () => {
    const all = allTagged('tv')
    const tv = all.find((mesh) => mesh.userData.tvFacing === undefined) as THREE.Mesh
    const monitors = all.filter((mesh) => mesh.userData.tvFacing === -1)
    return { all, tv, monitors }
  }
  const paintOf = (mesh: THREE.Mesh) => mesh.material as THREE.MeshBasicMaterial
  /** Les LED infrarouges des caméras de la scène : la lumière de 18 m de portée. */
  const leds = () => {
    let found: THREE.PointLight | null = null
    root().traverse((child) => {
      if ((child as THREE.PointLight).isPointLight && (child as THREE.PointLight).distance === 18) found = child as THREE.PointLight
    })
    return found as unknown as THREE.PointLight
  }
  /** Clique l'écran, vu de face : la télé regarde vers +z, un écran du bureau vers −z. */
  const clickScreen = (mesh: THREE.Mesh) => {
    aim(mesh, [0, 0, mesh.userData.tvFacing === -1 ? -0.8 : 1.5])
    click()
  }

  it('la télé et les deux écrans du bureau se cliquent : la souris devient une main, chacun a son matériau', () => {
    render(<Kitchen3D apiKey="k" />)
    const { all, tv, monitors } = screens()
    expect(all).toHaveLength(3)
    expect(monitors).toHaveLength(2)
    expect(new Set(all.map((mesh) => mesh.material)).size).toBe(3)
    lookAway()
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('')
    aim(tv, [0, 0, 1.5])
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('pointer')
  })

  it('un clic sur la télé y montre la vue d’une caméra, la vue vient se placer en face ; clic après clic, les caméras défilent, puis l’écran s’éteint et la vue revient où elle était', () => {
    render(<Kitchen3D apiKey="k" />)
    frame()
    const { tv, monitors } = screens()
    const [controls] = h.controls
    aim(tv, [0, 0, 1.5])
    const before = camera().position.clone()
    const pivot = controls.target.clone()
    const updates = controls.update.mock.calls.length
    click()
    // La télé montre une image ; les écrans du bureau restent éteints.
    expect(paintOf(tv).map).not.toBeNull()
    expect(paintOf(tv).color.getHex()).toBe(0xffffff)
    for (const monitor of monitors) expect(paintOf(monitor).color.getHex()).toBe(SCREEN_OFF)
    // La vue est en face de l'écran, à sa hauteur, d'autant plus loin qu'il est large (2,20 m environ pour la télé).
    const center = worldOf(tv)
    const wide = LAYOUT.tv.width - 0.03
    expect(wide * 1.8).toBeGreaterThan(0.9)
    expect(camera().position.toArray()).toEqual([expect.closeTo(center.x), expect.closeTo(center.y), expect.closeTo(center.z + wide * 1.8)])
    expect(controls.target.distanceTo(center)).toBeCloseTo(0)
    expect(controls.update.mock.calls.length).toBe(updates + 1)
    // L'image : l'écran est redessiné d'abord (dans sa texture, toutes couches vues), puis le jardin et la maison.
    h.shots.length = 0
    frame()
    expect(h.shots).toEqual([
      { mask: ALL_LAYERS, screen: true, stale: false, autoClear: true },
      { mask: 1 << OUTDOOR, screen: false, stale: false, autoClear: true },
      { mask: 1 << INDOOR, screen: false, stale: false, autoClear: false },
    ])
    expect(h.renderers[0].clear).toHaveBeenCalledTimes(1)
    expect(h.renderers[0].target).toBeNull()
    // Il fait jour : pas d'infrarouge.
    expect(leds().intensity).toBe(0)
    // Tant que l'écran est allumé, chaque image le redessine.
    act(() => controls.move())
    h.shots.length = 0
    frame()
    expect(h.shots.map((shot) => shot.screen)).toEqual([true, false, false])
    // Six caméras dans la scène : cinq clics de plus, toujours allumée, la vue ne bouge plus ; le septième éteint.
    for (let more = 0; more < 5; more += 1) {
      clickScreen(tv)
      expect(paintOf(tv).map).not.toBeNull()
    }
    clickScreen(tv)
    expect(paintOf(tv).map).toBeNull()
    expect(paintOf(tv).color.getHex()).toBe(SCREEN_OFF)
    // La vue d'avant est retrouvée.
    expect(camera().position.distanceTo(before)).toBeCloseTo(0)
    expect(controls.target.distanceTo(pivot)).toBeCloseTo(0)
    // Éteinte, elle n'est plus redessinée.
    frame()
    h.shots.length = 0
    act(() => controls.move())
    frame()
    expect(h.shots.map((shot) => shot.screen)).toEqual([false, false])
  })

  it('on change d’écran en cours de route : la vue passe devant le nouveau (plus près, il est petit), le premier s’éteint, et la vue d’avant reste celle du tout début', () => {
    render(<Kitchen3D apiKey="k" />)
    const { tv, monitors } = screens()
    const [controls] = h.controls
    aim(tv, [0, 0, 1.5])
    const before = camera().position.clone()
    click()
    clickScreen(monitors[0])
    expect(paintOf(monitors[0]).map).not.toBeNull()
    expect(paintOf(tv).map).toBeNull()
    expect(paintOf(monitors[1]).map).toBeNull()
    // En face de l'écran du bureau, du côté du fauteuil (−z), à 99 cm.
    const center = worldOf(monitors[0])
    expect(camera().position.toArray()).toEqual([expect.closeTo(center.x), expect.closeTo(center.y), expect.closeTo(center.z - 0.55 * 1.8)])
    expect(controls.target.distanceTo(center)).toBeCloseTo(0)
    // Le même écran de nouveau : la vue ne bouge pas (on peut l'avoir tournée entre-temps).
    aim(monitors[0], [0, 0, -0.5])
    const moved = camera().position.clone()
    click()
    expect(camera().position.distanceTo(moved)).toBe(0)
    // Encore quatre caméras, puis l'écran s'éteint : retour à la vue du tout début.
    for (let more = 0; more < 4; more += 1) clickScreen(monitors[0])
    expect(paintOf(monitors[0]).map).toBeNull()
    expect(camera().position.distanceTo(before)).toBeCloseTo(0)
  })

  it('la nuit, la caméra voit en infrarouge : ses LED éclairent le temps de l’image', () => {
    h.weather = { isDay: false, code: 0 }
    render(<Kitchen3D apiKey="k" />)
    frame()
    clickScreen(screens().tv)
    frame()
    expect(leds().intensity).toBe(14)
    expect(leds().visible).toBe(false)
  })

  it('au démontage, la texture des écrans est libérée', () => {
    const dispose = vi.spyOn(THREE.WebGLRenderTarget.prototype, 'dispose')
    const view = render(<Kitchen3D apiKey="k" />)
    view.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})

describe('Kitchen3D : les voyants du switch', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const colorOf = (rank: number) => (tagged('blink', rank).material as THREE.MeshBasicMaterial).color.getHex()
  const [GREEN, YELLOW, DARK] = [0x35d06a, 0xf2c531, 0x1c2a1e]

  it('clignotent comme ceux de prises RJ45 : les voyants de lien (pairs) verts presque toujours allumés, ceux d’activité (impairs) jaunes ; une image seulement quand l’un d’eux change', () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const view = render(<Kitchen3D apiKey="k" />)
    frame()
    expect(allTagged('blink')).toHaveLength(6)
    const tick = (to: number) => {
      now = to
      act(() => {
        vi.advanceTimersByTime(60)
      })
    }
    // Premier passage : tous s'éteignent un instant.
    tick(1000)
    expect([colorOf(0), colorOf(1)]).toEqual([DARK, DARK])
    expect(h.frames).toHaveLength(1)
    frame()
    // Rien n'est dû : ni changement, ni image.
    tick(1050)
    expect(h.frames).toHaveLength(0)
    // Un voyant de lien ne reste éteint que 0,1 s : il se rallume, vert.
    tick(1100)
    expect(colorOf(0)).toBe(GREEN)
    expect(h.frames).toHaveLength(1)
    frame()
    // Un voyant d'activité papillote (60 à 400 ms) : il se rallume à son tour, jaune.
    tick(1230)
    expect(colorOf(1)).toBe(YELLOW)
    frame()
    // Le lien, allumé pour 2 à 7 s (ici 4,5 s), s'éteint de nouveau à son heure.
    tick(5590)
    frame()
    tick(5600)
    expect(colorOf(0)).toBe(DARK)
    frame()
    // Hors de l'écran, rien ne clignote.
    act(() => h.visibility[0]([{ isIntersecting: false }]))
    tick(20_000)
    expect(colorOf(0)).toBe(DARK)
    expect(h.frames).toHaveLength(0)
    // Démontée, la minuterie s'arrête.
    act(() => h.visibility[0]([{ isIntersecting: true }]))
    frame()
    view.unmount()
    h.frames.length = 0
    tick(40_000)
    expect(h.frames).toHaveLength(0)
  })

  it('sans voyant dans la scène : la minuterie ne demande jamais d’image', () => {
    h.noBlink = true
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    render(<Kitchen3D apiKey="k" />)
    frame()
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(h.frames).toHaveLength(0)
  })
})

describe('Kitchen3D : la prise connectée (le radiateur de la cage)', () => {
  const plug = (on: boolean): PlugState => ({ alias: 'chauffage', model: 'HS100', on, rssi: -60, onTime: 0, timerSeconds: null, offOnMotion: false })
  const heater = () => tagged('plug', true)
  const ledColor = () => (tagged('plugLed', true).material as THREE.MeshBasicMaterial).color.getHex()
  /** Vise le corps du radiateur (à mi-hauteur), de face. */
  const aimHeater = () => {
    const at = worldOf(heater()).add(new THREE.Vector3(0, 0.27, 0))
    look(at.clone().add(new THREE.Vector3(0, 0.1, 1)), at)
  }

  it('un clic sur le radiateur allume ou éteint la prise ; la souris devient une main au-dessus', async () => {
    h.plug = plug(false)
    const view = render(<Kitchen3D apiKey="k" />)
    aimHeater()
    pointer('pointermove')
    expect(canvas().style.cursor).toBe('pointer')
    click()
    expect(h.setPlug).toHaveBeenCalledExactlyOnceWith('k', true)
    // Allumée : le clic l'éteint. Un ordre refusé par la maison ne casse rien.
    h.plug = plug(true)
    h.setPlug = vi.fn(() => Promise.reject(new Error('prise injoignable')))
    view.rerender(<Kitchen3D apiKey="k" />)
    click()
    expect(h.setPlug).toHaveBeenCalledExactlyOnceWith('k', false)
    await settle()
    expect(h.toggle).not.toHaveBeenCalled()
    expect(h.change).not.toHaveBeenCalled()
  })

  it('sans état connu de la prise, le clic ne fait rien', () => {
    render(<Kitchen3D apiKey="k" />)
    aimHeater()
    click()
    expect(h.setPlug).not.toHaveBeenCalled()
  })

  it('son voyant suit la prise : rouge allumée, gris éteinte ou inconnue ; en vue Matrix, vert allumée et rouge éteinte, comme ses cercles', () => {
    const view = render(<Kitchen3D apiKey="k" />)
    frame()
    expect(ledColor()).toBe(0x4a4640)
    h.plug = plug(true)
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ledColor()).toBe(0xff3b30)
    // Le changement est dessiné.
    frame()
    expect(h.frames).toHaveLength(0)
    h.plug = plug(false)
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ledColor()).toBe(0x4a4640)
    fireEvent.click(screen.getByRole('button', { name: MATRIX_LABEL.on }))
    expect(ledColor()).toBe(0xd43a2f)
    expect(ringColor(heater())).toBe(MATRIX_CAMERA)
    h.plug = plug(true)
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ledColor()).toBe(0x2fd45a)
    expect(ringColor(heater())).toBe(0x2fd45a)
  })
})

describe('Kitchen3D : la vue Matrix suit la maison', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const matrix = () => fireEvent.click(screen.getByRole('button', { name: MATRIX_LABEL.on }))
  const sprites = () => root().children.filter((child): child is THREE.Sprite => (child as THREE.Sprite).isSprite)

  it('les cercles des clims : verts en marche, rouges à l’arrêt ou sans état', () => {
    h.units = [unit('salon'), unit('chambre-invite', { power: false }), unit('chambre-matou', { reachable: false })]
    const view = render(<Kitchen3D apiKey="k" />)
    matrix()
    const colors = () => ['salon', 'chambre-invite', 'chambre-matou'].map((id) => ringColor(tagged('acUnit', id)))
    expect(colors()).toEqual([0x2fd45a, MATRIX_CAMERA, MATRIX_CAMERA])
    h.units = [unit('salon', { power: false }), unit('chambre-invite'), unit('chambre-matou')]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(colors()).toEqual([MATRIX_CAMERA, 0x2fd45a, 0x2fd45a])
  })

  it('les lampes : cercles jaunes allumée, rouges éteinte ; une lampe injoignable a l’ampoule rouge, en vue Matrix seulement', () => {
    h.lamps = [lamp('l1', 0, 0, { name: 'Salon' }), lamp('l2', 0, 0, { name: 'Chambre', reachable: false })]
    const view = render(<Kitchen3D apiKey="k" />)
    const bulbColor = (name: string) => (tagged('fixtureName', name).material as THREE.MeshBasicMaterial).color.getHex()
    expect(bulbColor('chambre')).toBe(BULB_OFF)
    matrix()
    expect(bulbColor('chambre')).toBe(0xff2a1f)
    expect(ringColor(tagged('fixtureName', 'chambre'))).toBe(MATRIX_CAMERA)
    expect(ringColor(tagged('fixtureName', 'salon'))).toBe(0xffd23a)
    // La lampe du salon s'éteint : ses cercles passent au rouge.
    h.lamps = [lamp('l1', 0, 0, { name: 'Salon', on: false }), h.lamps[1]]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ringColor(tagged('fixtureName', 'salon'))).toBe(MATRIX_CAMERA)
    // De retour à la vue normale, l'ampoule injoignable redevient seulement éteinte.
    fireEvent.click(screen.getByRole('button', { name: MATRIX_LABEL.off }))
    expect(bulbColor('chambre')).toBe(BULB_OFF)
  })

  it('les volets : violets fermés, bleu ciel ouverts, et leur couleur suit la maison', () => {
    h.shutters = shuttersOf({ 'Volet cuisine': 'down', 'Volet salon': 'up' })
    const view = render(<Kitchen3D apiKey="k" />)
    matrix()
    const colorOf = (key: string) => ((tagged('shutter', key).children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHex()
    expect([colorOf('cuisine'), colorOf('salon')]).toEqual([0x9b59ff, 0x6fc8ff])
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'down' })
    view.rerender(<Kitchen3D apiKey="k" />)
    expect([colorOf('cuisine'), colorOf('salon')]).toEqual([0x6fc8ff, 0x9b59ff])
  })

  it('les caméras : leur état est lu sur le switch PoE toutes les 5 s ; cercles verts en marche, orange en démarrage, rouges coupée ou inconnue ; une lecture ratée garde le dernier état', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    // (Sans les voyants du switch : eux aussi demandent des images.)
    h.noBlink = true
    const power = (camera: string, powered: boolean, streaming: boolean): CameraPower => ({ camera, powered, streaming }) as CameraPower
    let late: (list: CameraPower[]) => void = () => undefined
    const read = vi
      .fn<(key: string) => Promise<CameraPower[]>>()
      .mockResolvedValueOnce([power('voliere-toit', true, true), power('salon-de-jardin', true, false), power('voliere-exterieur', false, false)])
      .mockRejectedValueOnce(new Error('switch injoignable'))
      .mockResolvedValueOnce([power('voliere-toit', false, false)])
      .mockImplementation(() => new Promise((resolve) => (late = resolve)))
    h.power = read
    const view = render(<Kitchen3D apiKey="k" />)
    expect(read).toHaveBeenCalledExactlyOnceWith('k')
    await settle()
    matrix()
    const colors = () => ['voliere-toit', 'salon-de-jardin', 'voliere-exterieur', 'pommier'].map((name) => ringColor(tagged('camera', name)))
    expect(colors()).toEqual([0x2fd45a, 0xff9a1f, MATRIX_CAMERA, MATRIX_CAMERA])
    // Cinq secondes plus tard, le switch ne répond pas : rien ne change.
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })
    expect(read).toHaveBeenCalledTimes(2)
    expect(colors()).toEqual([0x2fd45a, 0xff9a1f, MATRIX_CAMERA, MATRIX_CAMERA])
    // Puis la caméra du toit est coupée ; les autres ne sont plus dans la réponse : sans état.
    while (h.frames.length > 0) frame()
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })
    expect(colors()).toEqual([MATRIX_CAMERA, MATRIX_CAMERA, MATRIX_CAMERA, MATRIX_CAMERA])
    // Le changement est dessiné.
    expect(h.frames).toHaveLength(1)
    // Une réponse arrivée après la fermeture est ignorée, et plus rien n'est lu.
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(read).toHaveBeenCalledTimes(4)
    view.unmount()
    await act(async () => {
      late([power('voliere-toit', true, true)])
      await Promise.resolve()
    })
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(read).toHaveBeenCalledTimes(4)
  })

  it('les températures : celle de chaque pièce lue par sa clim, celles des détecteurs Hue (salle de bain, cage dedans et dehors), en étiquettes montrées en vue Matrix seulement', () => {
    const context = fakeContext2d()
    stubCanvasContext(context)
    const written: [string, string][] = []
    context.fillText.mockImplementation((text: string) => {
      if (text === '–' || text.endsWith('°')) written.push([text, context.fillStyle])
    })
    const sensor = (id: string, name: string, temperature: number | null, reachable = true): HueSensor => ({ id, name, presence: null, presenceSince: null, temperature, lux: null, dark: null, battery: 100, reachable })
    const view = render(<Kitchen3D apiKey="k" />)
    // Trois clims et trois détecteurs ; rien n'est encore lu : six « – », orange (aucun état de clim).
    expect(sprites()).toHaveLength(6)
    expect(written).toEqual(Array.from({ length: 6 }, () => ['–', '#ff9a1f']))
    expect(sprites().every((sprite) => !sprite.visible)).toBe(true)
    written.length = 0
    h.units = [unit('salon', { roomTemp: 21.46 }), unit('chambre-invite', { power: false, roomTemp: 19 }), unit('chambre-matou', { reachable: false, roomTemp: 18 })]
    h.sensors = [
      sensor('60', 'Salle de bain', 23.04),
      sensor('54', 'Motion interieur', 12.3),
      sensor('57', 'Motion Exterieur', 4, false),
      // Un autre détecteur dont le nom contient « ext » : ce n'est pas un de ceux de la cage.
      sensor('99', 'extension', 30),
    ]
    view.rerender(<Kitchen3D apiKey="k" />)
    // La clim en marche en vert, celle à l'arrêt en rouge, l'injoignable sans température et en rouge ; les détecteurs en orange. Celui du dehors, injoignable, reste « – ».
    expect([...written].sort()).toEqual(
      [
        ['21,5°', '#2fd45a'],
        ['19,0°', '#ff3b30'],
        ['–', '#ff3b30'],
        ['23,0°', '#ff9a1f'],
        ['12,3°', '#ff9a1f'],
      ].sort(),
    )
    // Les nouvelles étiquettes sont dessinées.
    expect(h.frames).toHaveLength(1)
    // Le détecteur du dehors revient ; celui de la salle de bain n'a plus de température.
    written.length = 0
    h.sensors = [sensor('60', 'Salle de bain', null), h.sensors[1], sensor('57', 'Motion Exterieur', 4), h.sensors[3]]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect([...written].sort()).toEqual(
      [
        ['–', '#ff9a1f'],
        ['4,0°', '#ff9a1f'],
      ].sort(),
    )
    // Elles ne se voient qu'en vue Matrix.
    matrix()
    expect(sprites().every((sprite) => sprite.visible)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: MATRIX_LABEL.off }))
    expect(sprites().every((sprite) => !sprite.visible)).toBe(true)
  })

  it('le thème de la page : sombre, les arêtes sont vertes sur fond noir ; il est suivi quand on le change', async () => {
    document.documentElement.dataset.theme = 'dark'
    render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    // Hors de la vue Matrix, le fond reste transparent.
    expect(renderer.setClearColor).toHaveBeenLastCalledWith(0x000000, 0)
    matrix()
    expect(renderer.setClearColor).toHaveBeenLastCalledWith(0x000000, 1)
    frame()
    // La page passe au thème clair : fond clair, tout de suite, et une image.
    await act(async () => {
      document.documentElement.dataset.theme = 'light'
      await Promise.resolve()
    })
    expect(renderer.setClearColor).toHaveBeenLastCalledWith(MATRIX_LIGHT.background, 1)
    expect(h.frames).toHaveLength(1)
    // Sans attribut de thème : clair aussi.
    await act(async () => {
      delete document.documentElement.dataset.theme
      await Promise.resolve()
    })
    expect(renderer.setClearColor).toHaveBeenLastCalledWith(MATRIX_LIGHT.background, 1)
  })

  it('au démontage, le thème de la page n’est plus suivi', async () => {
    const view = render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    view.unmount()
    renderer.setClearColor.mockClear()
    await act(async () => {
      document.documentElement.dataset.theme = 'dark'
      await Promise.resolve()
    })
    expect(renderer.setClearColor).not.toHaveBeenCalled()
  })
})
