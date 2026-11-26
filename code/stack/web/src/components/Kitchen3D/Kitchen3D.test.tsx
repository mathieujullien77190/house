import { act, fireEvent, render, screen } from '@testing-library/react'
import type * as THREE from 'three'
import type { PlanLamp } from '@house/ui'
import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { MAP_HOUSE_HEIGHT } from '@/components/MapPlan/constants'
import { stubCanvasContext } from '@/test/canvas'
import { LAMP_LIGHT, NO_WEBGL_TEXT, PLAN_HOUSE, START, TARGET, TOP, VIEW_HEIGHT } from './constants'
import Kitchen3D from './Kitchen3D'
import type { SceneParts } from './types'

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
  lamps: [] as PlanLamp[],
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
vi.mock('@/lib/three', async (original) => ({ ...(await original<typeof import('@/lib/three')>()), supportsWebGL: () => h.supported }))
vi.mock('@/lib/usePlan', () => ({ usePlan: () => ({ items: { l1: { x: 1, y: 2 } } }) }))
vi.mock('@/lib/useLampPlan', () => ({
  useLampPlan: (apiKey: string, items: Record<string, unknown>, enabled: boolean) => {
    h.planKeys.push(`${apiKey} ${Object.keys(items).join()} ${enabled}`)
    return { lamps: h.lamps, toggle: () => undefined }
  },
}))
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

/** Une lampe du plan de Home, à une place de la maison (unités du plan, 540 × 300). */
const lamp = (id: string, houseX: number, houseY: number, over: Partial<PlanLamp> = {}): PlanLamp => ({
  id,
  name: id,
  x: houseX + HOUSE_SHIFT,
  y: (houseY * MAP_HOUSE_HEIGHT) / PLAN_HOUSE.height,
  on: true,
  reachable: true,
  ...over,
})

beforeEach(() => {
  h.supported = true
  h.lamps = []
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
const lightsOf = (parts: SceneParts) => {
  const lights: THREE.PointLight[] = []
  parts.root.traverse((child) => {
    if ((child as THREE.PointLight).isPointLight) lights.push(child as THREE.PointLight)
  })
  return lights
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

  it('les boutons : la hotte se cache, la vue du dessus et le retour à la vue de départ', () => {
    render(<Kitchen3D apiKey="k" />)
    const hood = screen.getByRole('button', { name: 'Hotte' })
    expect(hood).toHaveAttribute('aria-pressed', 'true')
    expect(h.parts[0].hood.visible).toBe(true)
    fireEvent.click(hood)
    expect(hood).toHaveAttribute('aria-pressed', 'false')
    expect(h.parts[0].hood.visible).toBe(false)
    fireEvent.click(hood)
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
      lamp('cuisine', 300, 70, { brightness: 127, color: '#ff8800' }),
      lamp('salon', 300, 220, { on: false }),
      lamp('a-placer', 300, 70, { waiting: true }),
      lamp('chambre', 100, 100),
    ]
    const view = render(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('1 lampe allumée sur 2 dans la pièce')).toBeInTheDocument()
    const lights = lightsOf(h.parts[0])
    expect(lights.map((light) => light.intensity)).toEqual([expect.closeTo((127 / 254) * LAMP_LIGHT.intensity), 0])
    expect(lights[0].color.getHexString()).toBe('ff8800')
    // La lampe du salon s'allume, sans couleur ni luminosité : blanc chaud, pleine puissance.
    h.lamps = [h.lamps[0], lamp('salon', 300, 220), h.lamps[2], h.lamps[3]]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('2 lampes allumées sur 2 dans la pièce')).toBeInTheDocument()
    expect(lightsOf(h.parts[0]).map((light) => light.intensity)).toEqual([expect.closeTo((127 / 254) * LAMP_LIGHT.intensity), LAMP_LIGHT.intensity])
    // Une lampe injoignable n'éclaire pas ; une lampe retirée du pont quitte la scène.
    h.lamps = [lamp('cuisine', 300, 70, { reachable: false })]
    view.rerender(<Kitchen3D apiKey="k" />)
    expect(screen.getByText('0 lampe allumée sur 1 dans la pièce')).toBeInTheDocument()
    expect(lightsOf(h.parts[0]).map((light) => light.intensity)).toEqual([0])
    expect(h.renderers).toHaveLength(1)
  })

  it('au démontage : la boucle s’arrête, tout est libéré et le contexte WebGL est rendu', () => {
    const view = render(<Kitchen3D apiKey="k" />)
    const [renderer] = h.renderers
    const canvas = renderer.domElement
    const floor = h.parts[0].root.children[0].children[0] as THREE.Mesh
    const dispose = vi.spyOn(floor.geometry, 'dispose')
    const element = host()
    view.unmount()
    expect(h.cancelled).toEqual([1])
    expect(h.disconnected.sort()).toEqual(['resize', 'visibility'])
    expect(h.controls[0].dispose).toHaveBeenCalledTimes(1)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(renderer.dispose).toHaveBeenCalledTimes(1)
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1)
    expect(canvas.isConnected).toBe(false)
    // L'écouteur du clic molette est retiré.
    expect(fireEvent.mouseDown(element, { button: 1 })).toBe(true)
  })
})
