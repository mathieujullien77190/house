import { act, fireEvent, render, screen } from '@testing-library/react'
import * as THREE from 'three'
import type { PlanLamp } from '@house/ui'
import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { MAP_HOUSE_HEIGHT } from '@/components/MapPlan/constants'
import { stubCanvasContext } from '@/test/canvas'
import type { AcUnit, ShutterCommand, ShuttersState } from '@/types'
import { CLIMATE_KEY } from './climate'
import { DAYLIGHT, LAMP_LIGHT, NO_WEBGL_TEXT, PLAN_HOUSE, ROOM, SHUTTER_ANIMATE_MS, START, TARGET, TOP, VIEW_HEIGHT } from './constants'
import Kitchen3D from './Kitchen3D'
import { AC_LED } from './live'
import { SHUTTER_KEYS, SHUTTER_TRAVEL_S } from './shutters'
import type { SceneParts } from './types'
import { WEATHER_LOOK } from './weather'

interface FakeRenderer {
  domElement: HTMLCanvasElement
  shadowMap: { enabled: boolean; type: number }
  setPixelRatio: ReturnType<typeof vi.fn>
  setSize: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  forceContextLoss: ReturnType<typeof vi.fn>
}

interface FakeControls {
  object: THREE.PerspectiveCamera
  domElement: HTMLElement
  target: THREE.Vector3
  mouseButtons: Record<string, number>
  enableDamping: boolean
  update: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

const h = vi.hoisted(() => ({
  supported: true,
  alwaysDay: false,
  lamps: [] as PlanLamp[],
  toggle: (() => undefined) as (id: string) => void,
  units: null as AcUnit[] | null,
  change: (() => undefined) as (id: string, change: { on: boolean }) => void,
  shutters: null as ShuttersState | null,
  send: (() => undefined) as (id: string, command: ShutterCommand) => void,
  weather: null as { isDay: boolean; code: number } | null,
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
    domElement = document.createElement('canvas')
    shadowMap = { enabled: false, type: 0 }
    setPixelRatio = vi.fn()
    setSize = vi.fn()
    render = vi.fn()
    dispose = vi.fn()
    forceContextLoss = vi.fn()
    constructor() {
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
    update = vi.fn()
    dispose = vi.fn()
    constructor(object: THREE.PerspectiveCamera, domElement: HTMLElement) {
      this.object = object
      this.domElement = domElement
      h.controls.push(this)
    }
  }
  return { OrbitControls }
})
// Le plein jour forcé (`ALWAYS_DAY`) est un réglage du code : les tests le choisissent pour passer par ses deux valeurs.
vi.mock('./constants', async (original) => {
  const actual = await original<typeof import('./constants')>()
  return {
    ...actual,
    get ALWAYS_DAY() {
      return h.alwaysDay
    },
  }
})
vi.mock('@/lib/three', async (original) => ({ ...(await original<typeof import('@/lib/three')>()), supportsWebGL: () => h.supported }))
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
// La scène est la vraie ; elle est seulement retenue pour y regarder la hotte et les lumières.
vi.mock('./helpers', async (original) => {
  const actual = await original<typeof import('./helpers')>()
  return {
    ...actual,
    buildScene: () => {
      const parts = actual.buildScene()
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
  h.alwaysDay = false
  h.lamps = []
  h.toggle = vi.fn()
  h.units = null
  h.change = vi.fn()
  h.shutters = null
  h.send = vi.fn()
  h.weather = { isDay: true, code: 0 }
  localStorage.clear()
  for (const list of [h.planKeys, h.renderers, h.controls, h.parts, h.resize, h.visibility, h.disconnected, h.frames, h.cancelled]) list.length = 0
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
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => h.frames.push(callback))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => h.cancelled.push(id))
})

const host = () => screen.getByRole('img')
const camera = () => h.controls[0].object
const canvas = () => h.renderers[0].domElement
const root = () => h.parts[0].root
const lightsOf = (parts: SceneParts) => {
  const lights: THREE.PointLight[] = []
  parts.root.traverse((child) => {
    if ((child as THREE.PointLight).isPointLight) lights.push(child as THREE.PointLight)
  })
  return lights
}

/** L'objet de la scène marqué par `userData[tag] === value`. */
const tagged = (tag: string, value: string): THREE.Mesh => {
  let found: THREE.Object3D | null = null
  root().traverse((child) => {
    if (child.userData[tag] === value) found = child
  })
  if (!found) throw new Error(`rien n'est marqué ${tag} = ${value}`)
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
    // Une première image est dessinée, et la suivante est demandée.
    expect(renderer.render).toHaveBeenCalledTimes(1)
    const [scene, drawn] = renderer.render.mock.calls[0] as [THREE.Scene, THREE.Camera]
    expect(drawn).toBe(camera())
    expect(scene.children[0]).toBe(h.parts[0].root)
    expect(scene.children.filter((child) => (child as THREE.Light).isLight)).toHaveLength(2)
    expect(h.frames).toHaveLength(1)
    act(() => h.frames[0]())
    expect(renderer.render).toHaveBeenCalledTimes(2)
    // Un nouveau rendu du composant ne recrée rien.
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(h.renderers).toHaveLength(1)
    expect(h.planKeys.at(-1)).toBe('k l1 true')
  })

  it('pas de rendu quand la vue est hors de l’écran', () => {
    render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    act(() => h.visibility[0]([{ isIntersecting: false }]))
    act(() => h.frames[0]())
    expect(renderer.render).toHaveBeenCalledTimes(1)
    // La boucle continue pourtant : au retour à l'écran, le rendu reprend.
    expect(h.frames).toHaveLength(2)
    act(() => h.visibility[0]([{ isIntersecting: true }]))
    act(() => h.frames[1]())
    expect(renderer.render).toHaveBeenCalledTimes(2)
  })

  it('suit la largeur de son bloc ; une largeur nulle est ignorée', () => {
    render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    expect(renderer.setSize).not.toHaveBeenCalled()
    Object.defineProperty(host(), 'clientWidth', { value: 1040, configurable: true })
    act(() => h.resize[0]())
    expect(renderer.setSize).toHaveBeenCalledExactlyOnceWith(1040, VIEW_HEIGHT)
    expect(camera().aspect).toBe(1040 / VIEW_HEIGHT)
  })

  it('les boutons : la vue du dessus et le retour à la vue de départ ; ni « Hotte » ni « Volets réels » (la hotte est toujours là)', () => {
    render(<Kitchen3D apiKey="k" />)
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Vue du dessus', 'Réinitialiser la vue', 'Vent'])
    expect(h.parts[0].hood.visible).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Vue du dessus' }))
    expect(camera().position.toArray()).toEqual([TOP.x, TOP.y, TOP.z])
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser la vue' }))
    expect(camera().position.toArray()).toEqual([START.x, START.y, START.z])
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
    expect(lights[0].color.getHexString()).toBe('ff8800')
    // La lampe du salon s'allume, sans couleur ni luminosité : blanc chaud, pleine puissance.
    h.lamps = [h.lamps[0], lamp('plan-salon', 300, 220), h.lamps[2], h.lamps[3]]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('2 lampes allumées sur 2 dans la pièce')).toBeInTheDocument()
    expect(lightsOf(h.parts[0]).map((light) => light.intensity)).toEqual([expect.closeTo((127 / 254) * LAMP_LIGHT.intensity), LAMP_LIGHT.intensity])
    // Une lampe injoignable n'éclaire pas ; une lampe retirée du pont quitte la scène.
    h.lamps = [lamp('plan-cuisine', 300, 70, { reachable: false })]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('0 lampe allumée sur 1 dans la pièce')).toBeInTheDocument()
    expect(lightsOf(h.parts[0]).map((light) => light.intensity)).toEqual([0])
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
    const floor = h.parts[0].root.children[0].children[0] as THREE.Mesh
    const dispose = vi.spyOn(floor.geometry, 'dispose')
    const element = host()
    aim(tagged('fixtureName', 'salon'), [1, -0.5, 1])
    view.unmount()
    expect(h.cancelled).toEqual([1])
    expect(h.disconnected.sort()).toEqual(['resize', 'visibility'])
    expect(h.controls[0].dispose).toHaveBeenCalledTimes(1)
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

  it('sans `onOpenCamera`, le clic sur une caméra ne fait rien', () => {
    render(<Kitchen3D apiKey="k" />)
    aim(tagged('camera', 'voliere-toit'), [0.2, 2, 0.2])
    click()
    expect(h.send).not.toHaveBeenCalled()
  })
})

describe('Kitchen3D : les volets et le jour', () => {
  const slatsOf = (key: string) => tagged('shutter', key)
  const shownOf = (key: string) => slatsOf(key).children.filter((slat) => slat.visible).length
  const lightsOfScene = () => {
    const [scene] = h.renderers[0].render.mock.calls[0] as [THREE.Scene]
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
    // Tout ouvert : plein jour.
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'up', 'Volet PC': 'up', 'Volet porte': 'up' })
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(shownOf('cuisine')).toBe(0)
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun)
    // Le ciel se couvre, puis la nuit tombe.
    h.weather = { isDay: true, code: 3 }
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day * 0.7)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun * 0.7)
    h.weather = { isDay: false, code: 0 }
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night)
  })

  it('plein jour forcé : la scène est éclairée comme en journée, volets fermés et de nuit compris ; les volets suivent quand même la maison', () => {
    h.alwaysDay = true
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
    now += 100
    act(() => h.frames[0]())
    expect(slats.userData.level).toBeCloseTo(1 - 0.1 / SHUTTER_TRAVEL_S)
    // Après une pause de l'onglet, un pas d'un quart de seconde au plus.
    now += 60_000
    act(() => h.frames[1]())
    expect(slats.userData.level).toBeCloseTo(1 - 0.35 / SHUTTER_TRAVEL_S)
    // Le délai d'animation est passé : un changement venu d'ailleurs se place d'un coup.
    expect(now).toBeGreaterThan(1000 + SHUTTER_ANIMATE_MS)
    h.shutters = shuttersOf({ 'Volet cuisine': 'down' })
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(slats.userData.level).toBe(1)
    expect(shownOf('cuisine')).toBe(slats.children.length)
  })
})

describe('Kitchen3D : l’heure', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('la pendule de la cuisine donne l’heure, remise à jour toutes les quinze secondes', () => {
    vi.useFakeTimers()
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
    // Démontée, la pendule s'arrête.
    view.unmount()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(minute.rotation.z).toBeCloseTo((0.5 / 60) * Math.PI * 2)
    // (Trente secondes d'horloge font tourner la boucle de dessin près de deux mille fois : ce test est long quand toute la suite tourne.)
  }, 20_000)

  it('sans météo, le jour qui entre suit l’heure : jour moyen à midi, nuit à 22 h', () => {
    h.weather = null
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'up', 'Volet PC': 'up', 'Volet porte': 'up' })
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 26, 12, 0, 0))
    const view = render(<Kitchen3D apiKey="k" />)
    const [scene] = h.renderers[0].render.mock.calls[0] as [THREE.Scene]
    const ambient = scene.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day * 0.7)
    vi.setSystemTime(new Date(2026, 10, 26, 22, 0, 0))
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night)
  })
})

describe('Kitchen3D : les saisons et le temps', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const sceneOf = () => root().parent as THREE.Scene
  /** Ce que le jardin montre sous cette marque de saison : `true` si tout se voit, `false` si rien. */
  const shown = (key: string): boolean => {
    const states = new Set<boolean>()
    root().traverse((child) => {
      if (child.userData.season === key) states.add(child.visible)
    })
    expect(states.size).toBe(1)
    return [...states][0]
  }
  const selected = (group: string) => screen.getByRole('tablist', { name: group }).querySelector('[aria-selected="true"]')?.textContent
  const pick = (name: string) => fireEvent.click(screen.getByRole('tab', { name }))
  const lights = () => {
    const ambient = sceneOf().children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight
    const sun = sceneOf().children.find((child) => (child as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight
    return { ambient, sun }
  }
  const snowCaps = (): THREE.Object3D[] => {
    const caps: THREE.Object3D[] = []
    root().traverse((child) => {
      if (((child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined)?.polygonOffset) caps.push(child)
    })
    return caps
  }
  const swayers = (): THREE.Object3D[] => {
    const found: THREE.Object3D[] = []
    root().traverse((child) => {
      if (typeof child.userData.sway === 'number') found.push(child)
    })
    return found
  }

  it('au départ : le printemps, du soleil, pas de vent ; les deux choix et le bouton du vent sont au-dessus de la vue', () => {
    render(<Kitchen3D apiKey="k" />)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Printemps', 'Été', 'Automne', 'Hiver', 'Auto', 'Soleil', 'Pluie', 'Neige'])
    expect(selected('Saison')).toBe('Printemps')
    expect(selected('Météo')).toBe('Soleil')
    expect(screen.getByRole('button', { name: 'Vent' })).toHaveAttribute('aria-pressed', 'false')
    // Le jardin au printemps : feuilles, fleurs, cerises, pâquerettes ; ni pommes ni raisin, ni bois nu.
    expect(['leaves', 'blossom', 'cherries', 'daisies', 'medlars', 'evergreen'].map(shown)).toEqual([true, true, true, true, true, true])
    expect(['harvest', 'twigs'].map(shown)).toEqual([false, false])
    // Ni pluie ni neige, pas de fond, rien ne se balance.
    expect(sceneOf().getObjectByName('rain')?.visible).toBe(false)
    expect(sceneOf().getObjectByName('snow')?.visible).toBe(false)
    expect(sceneOf().background).toBeNull()
    expect(snowCaps().length).toBeGreaterThan(60)
    expect(snowCaps().every((cap) => !cap.visible)).toBe(true)
    act(() => h.frames[0]())
    expect(swayers().length).toBeGreaterThan(20)
    expect(swayers().every((object) => object.matrixAutoUpdate)).toBe(true)
  })

  it('le choix de la saison met le jardin à cette saison, sans reconstruire la scène', () => {
    render(<Kitchen3D apiKey="k" />)
    pick('Été')
    expect(selected('Saison')).toBe('Été')
    expect(['leaves', 'daisies', 'blossom', 'cherries', 'harvest'].map(shown)).toEqual([true, true, false, false, false])
    pick('Automne')
    expect(['leaves', 'harvest', 'daisies', 'blossom'].map(shown)).toEqual([true, true, false, false])
    pick('Hiver')
    expect(['evergreen', 'twigs', 'leaves', 'blossom', 'harvest', 'medlars', 'daisies'].map(shown)).toEqual([true, true, false, false, false, false, false])
    pick('Printemps')
    expect(['leaves', 'blossom', 'twigs'].map(shown)).toEqual([true, true, false])
    expect(h.parts).toHaveLength(1)
    expect(h.renderers).toHaveLength(1)
  })

  it('« Auto » : la saison du jour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 14, 12))
    const view = render(<Kitchen3D apiKey="k" />)
    pick('Auto')
    expect(selected('Saison')).toBe('Auto')
    // Un 14 juillet : l'été.
    expect(['leaves', 'daisies', 'blossom', 'harvest'].map(shown)).toEqual([true, true, false, false])
    view.unmount()
    // Rouverte un 27 novembre, toujours sur « Auto » : l'automne.
    vi.setSystemTime(new Date(2026, 10, 27, 12))
    for (const list of [h.parts, h.renderers, h.controls]) list.length = 0
    render(<Kitchen3D apiKey="k" />)
    expect(selected('Saison')).toBe('Auto')
    expect(['leaves', 'harvest', 'daisies', 'blossom'].map(shown)).toEqual([true, true, false, false])
  })

  it('le choix est gardé sur l’appareil : la vue se rouvre comme on l’a laissée', () => {
    const view = render(<Kitchen3D apiKey="k" />)
    pick('Hiver')
    pick('Neige')
    fireEvent.click(screen.getByRole('button', { name: 'Vent' }))
    expect(JSON.parse(localStorage.getItem(CLIMATE_KEY) ?? '')).toEqual({ season: 'winter', sky: 'snow', wind: true })
    view.unmount()
    for (const list of [h.parts, h.renderers, h.controls, h.frames]) list.length = 0
    render(<Kitchen3D apiKey="k" />)
    expect(selected('Saison')).toBe('Hiver')
    expect(selected('Météo')).toBe('Neige')
    expect(screen.getByRole('button', { name: 'Vent' })).toHaveAttribute('aria-pressed', 'true')
    expect(shown('leaves')).toBe(false)
    expect(sceneOf().getObjectByName('snow')?.visible).toBe(true)
  })

  it('la pluie : des gouttes qui tombent à chaque image, un ciel gris, moins de jour et presque plus de soleil', () => {
    h.alwaysDay = true
    render(<Kitchen3D apiKey="k" />)
    const { ambient, sun } = lights()
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day)
    pick('Pluie')
    expect(selected('Météo')).toBe('Pluie')
    const rain = sceneOf().getObjectByName('rain') as THREE.LineSegments
    expect(rain.visible).toBe(true)
    expect((sceneOf().background as THREE.Color).getHex()).toBe(WEATHER_LOOK.rain.background)
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day * WEATHER_LOOK.rain.ambient)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun * WEATHER_LOOK.rain.sun)
    // Les gouttes avancent à chaque image dessinée, pas quand la vue est hors de l'écran.
    const points = rain.geometry.attributes.position as THREE.BufferAttribute
    expect((points.array as Float32Array).every((value) => value === 0)).toBe(true)
    act(() => h.visibility[0]([{ isIntersecting: false }]))
    act(() => h.frames[0]())
    expect(points.version).toBe(0)
    act(() => h.visibility[0]([{ isIntersecting: true }]))
    act(() => h.frames[1]())
    expect(points.version).toBe(1)
    expect((points.array as Float32Array).some((value) => value !== 0)).toBe(true)
    // Le beau temps revient.
    pick('Soleil')
    expect(rain.visible).toBe(false)
    expect(sceneOf().background).toBeNull()
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun)
  })

  it('la neige : des flocons, une couche blanche sur le jardin, un ciel clair ; le temps dose aussi le jour qui entre par les fenêtres', () => {
    h.shutters = shuttersOf({ 'Volet cuisine': 'up', 'Volet salon': 'up', 'Volet PC': 'up', 'Volet porte': 'up' })
    h.weather = { isDay: true, code: 3 }
    render(<Kitchen3D apiKey="k" />)
    pick('Neige')
    expect(sceneOf().getObjectByName('snow')?.visible).toBe(true)
    expect(sceneOf().getObjectByName('rain')?.visible).toBe(false)
    expect(snowCaps().every((cap) => cap.visible)).toBe(true)
    expect((sceneOf().background as THREE.Color).getHex()).toBe(WEATHER_LOOK.snow.background)
    const { ambient, sun } = lights()
    expect(ambient.intensity).toBeCloseTo(DAYLIGHT.night + DAYLIGHT.day * 0.7 * WEATHER_LOOK.snow.ambient)
    expect(sun.intensity).toBeCloseTo(DAYLIGHT.sun * 0.7 * WEATHER_LOOK.snow.sun)
    pick('Pluie')
    expect(snowCaps().every((cap) => !cap.visible)).toBe(true)
  })

  it('le vent s’ajoute à tout : arbres, spirées et herbe se balancent à chaque image, même par beau temps ; il tombe, tout se redresse', () => {
    render(<Kitchen3D apiKey="k" />)
    const wind = screen.getByRole('button', { name: 'Vent' })
    fireEvent.click(wind)
    expect(wind).toHaveAttribute('aria-pressed', 'true')
    expect(selected('Météo')).toBe('Soleil')
    act(() => h.frames[0]())
    expect(swayers().every((object) => !object.matrixAutoUpdate)).toBe(true)
    // Avec la pluie : les deux à la fois.
    pick('Pluie')
    expect(wind).toHaveAttribute('aria-pressed', 'true')
    expect(sceneOf().getObjectByName('rain')?.visible).toBe(true)
    fireEvent.click(wind)
    expect(wind).toHaveAttribute('aria-pressed', 'false')
    expect(swayers().every((object) => object.matrixAutoUpdate)).toBe(true)
    expect(selected('Météo')).toBe('Pluie')
  })
})
