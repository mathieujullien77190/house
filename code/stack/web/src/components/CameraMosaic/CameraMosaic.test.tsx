import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Camera, EventRow } from '@/types'
import CameraMosaic from './CameraMosaic'

/* eslint-disable @typescript-eslint/no-explicit-any -- doubles : les props des composants remplacés sont inspectées librement */
const h = vi.hoisted(() => {
  const plan = () => ({
    trees: [],
    hedges: [],
    cage: { x: 100, y: 100, w: 10, h: 10 },
    offsets: {},
    items: {} as Record<string, { x: number; y: number }>,
    cameras: [
      { id: 'c-in', name: 'in', x: 1, y: 1, angle: 0, fov: 60, near: 5, far: 100 },
      { id: 'c-out', name: 'out', x: 2, y: 2, angle: 0, fov: 60, near: 5, far: 100 },
      { id: 'c-libre', name: 'libre', x: 3, y: 3, angle: 0, fov: 60, near: 5, far: 100 },
    ],
    links: { 'c-in': 'voliere-interieur', 'c-out': 'voliere-exterieur' } as Record<string, string>,
    moveTree: vi.fn(),
    resizeTree: vi.fn(),
    moveHedge: vi.fn(),
    moveCage: vi.fn(),
    moveOffset: vi.fn(),
    moveItem: vi.fn(),
    moveCamera: vi.fn(),
    adjustCamera: vi.fn(),
    link: vi.fn(),
  })
  return {
    fresh: plan,
    plan: plan(),
    mobile: false,
    lamps: [] as any[],
    toggle: vi.fn(),
    lampPlanArgs: null as any,
    plug: null as any,
    powers: {} as Record<string, any>,
    map: null as any,
    tiles: [] as any[],
  }
})

vi.mock('@/lib/usePlan', () => ({ usePlan: () => h.plan }))
vi.mock('@/lib/useLampPlan', () => ({
  useLampPlan: (...args: unknown[]) => {
    h.lampPlanArgs = args
    return { lamps: h.lamps, toggle: h.toggle }
  },
}))
vi.mock('@/lib/usePlug', () => ({ usePlug: () => h.plug }))
vi.mock('@/lib/usePower', () => ({ usePower: (_k: string, camera: string) => ({ power: h.powers[camera] ?? null }) }))
vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/lib/useMatchHeight', () => ({ useMatchHeight: vi.fn() }))
vi.mock('@/components/MapPlan', () => ({
  default: (props: any) => {
    h.map = props
    return <div data-testid="map" />
  },
}))
vi.mock('@/components/LiveTile', () => ({
  default: (props: any) => {
    h.tiles.push(props)
    return (
      <div data-testid={`tile-${props.camera.name}`}>
        <button onClick={props.onOpen}>ouvrir {props.camera.name}</button>
        {props.onOpenClip ? <button onClick={props.onOpenClip}>clip {props.camera.name}</button> : null}
        <span>{props.read ? 'lu' : 'non lu'}</span>
      </div>
    )
  },
}))

const camera = (name: string, orientation: Camera['orientation'] = 'landscape'): Camera => ({ name, orientation })
const event = (id: string, cameraName: string, clip: string | null = `/clips/${id}`): EventRow =>
  ({ id, camera: cameraName, clip }) as EventRow

const mount = (over: Partial<Parameters<typeof CameraMosaic>[0]> = {}) => {
  const onOpen = vi.fn()
  const view = render(
    <CameraMosaic
      apiKey="k"
      cameras={[camera('voliere-exterieur'), camera('voliere-interieur'), camera('autre', 'portrait')]}
      events={[]}
      isRead={() => false}
      onOpen={onOpen}
      {...over}
    />,
  )
  return { ...view, onOpen }
}

beforeEach(() => {
  h.plan = h.fresh()
  h.mobile = false
  h.lamps = []
  h.toggle = vi.fn()
  h.lampPlanArgs = null
  h.plug = null
  h.powers = {}
  h.map = null
  h.tiles = []
})

describe('CameraMosaic : vignettes', () => {
  it('range les caméras en paysage puis celles posées de côté', () => {
    mount()
    expect(screen.getByTestId('tile-voliere-interieur')).toBeInTheDocument()
    expect(screen.getByTestId('tile-autre')).toBeInTheDocument()
    const order = [...document.querySelectorAll('[data-testid^=tile-]')].map((e) => e.getAttribute('data-testid'))
    expect(order).toEqual(['tile-voliere-interieur', 'tile-voliere-exterieur', 'tile-autre'])
  })
  it('un clic ouvre la caméra ; la ligne du dernier événement ouvre son clip s’il en a un', () => {
    const events = [event('e2', 'voliere-interieur'), event('e1', 'voliere-interieur'), event('x', 'voliere-exterieur', null)]
    const { onOpen } = mount({ events, isRead: (id) => id === 'e2' })
    fireEvent.click(screen.getByText('ouvrir voliere-interieur'))
    expect(onOpen).toHaveBeenLastCalledWith('voliere-interieur')
    fireEvent.click(screen.getByText('clip voliere-interieur'))
    expect(onOpen).toHaveBeenLastCalledWith('voliere-interieur', 'e2')
    expect(screen.queryByText('clip voliere-exterieur')).toBeNull()
    expect(screen.getByTestId('tile-voliere-interieur')).toHaveTextContent(/^ouvrir voliere-interieurclip voliere-interieurlu$/)
    expect(screen.getByTestId('tile-voliere-exterieur')).toHaveTextContent('non lu')
  })
  it('survoler une vignette choisit l’icône liée sur le plan, la quitter la désélectionne', () => {
    mount()
    const tile = screen.getByTestId('tile-voliere-interieur').parentElement as HTMLElement
    fireEvent.mouseEnter(tile)
    expect(h.map.selectedCameraId).toBe('c-in')
    expect(tile.className).toContain('ring-2')
    fireEvent.mouseLeave(tile)
    expect(h.map.selectedCameraId).toBe('')
  })
  it('survol d’une vignette sans icône liée : rien', () => {
    mount()
    const tile = screen.getByTestId('tile-autre').parentElement as HTMLElement
    fireEvent.mouseEnter(tile)
    fireEvent.mouseLeave(tile)
    expect(h.map.selectedCameraId).toBe('')
  })
  it('quitter la vignette ne désélectionne pas un choix fait sur la carte', () => {
    mount()
    act(() => h.map.onSelectCamera('c-in'))
    const tile = screen.getByTestId('tile-voliere-interieur').parentElement as HTMLElement
    fireEvent.mouseEnter(tile)
    fireEvent.mouseLeave(tile)
    expect(h.map.selectedCameraId).toBe('c-in')
  })
  it('survoler une autre vignette puis la quitter quand une autre icône est choisie', () => {
    mount()
    act(() => h.map.onSelectCamera('c-out'))
    const tile = screen.getByTestId('tile-voliere-interieur').parentElement as HTMLElement
    fireEvent.mouseEnter(tile)
    expect(h.map.selectedCameraId).toBe('c-in')
    act(() => h.map.onSelectCamera('c-out'))
    fireEvent.mouseLeave(tile)
    expect(h.map.selectedCameraId).toBe('c-out')
  })
})

describe('CameraMosaic : survols croisés', () => {
  it('quitter une vignette après être entré dans une autre garde la sélection de l’autre', () => {
    mount()
    const inside = screen.getByTestId('tile-voliere-interieur').parentElement as HTMLElement
    const outside = screen.getByTestId('tile-voliere-exterieur').parentElement as HTMLElement
    fireEvent.mouseEnter(inside)
    fireEvent.mouseEnter(outside)
    fireEvent.mouseLeave(inside)
    expect(h.map.selectedCameraId).toBe('c-out')
  })
})

describe('CameraMosaic : la carte', () => {
  it('pas de carte sur téléphone', () => {
    h.mobile = true
    mount()
    expect(screen.queryByTestId('map')).toBeNull()
  })

  it('passe le plan à la carte ; contour rouge sans lien ou caméra éteinte', () => {
    h.powers = { 'voliere-interieur': { on: false }, 'voliere-exterieur': { on: true } }
    mount()
    expect(h.map.cameraNames).toEqual(['voliere-exterieur', 'voliere-interieur', 'autre'])
    const off = Object.fromEntries(h.map.cameras.map((c: any) => [c.id, c.off]))
    expect(off).toEqual({ 'c-in': true, 'c-out': undefined, 'c-libre': true })
    h.powers = { 'voliere-exterieur': { on: false } }
    mount()
    expect(h.map.cameras.find((c: any) => c.id === 'c-out').off).toBe(true)
    expect(h.map.cameras.find((c: any) => c.id === 'c-in').off).toBeUndefined()
  })

  it('toutes les lampes du pont vont à la carte, avec le plan et l’interrupteur ; la prise est posée à sa place de départ ou déplacée', () => {
    h.lamps = [
      { id: '26', name: 'P', on: true, reachable: true, x: 1, y: 2, indoor: false },
      { id: '3', name: 'Q', on: false, reachable: true, x: 3, y: 4, indoor: true },
    ]
    h.plug = { alias: 'prise', on: false }
    mount()
    expect(h.map.lamps).toBe(h.lamps)
    expect(h.map.onToggleLamp).toBe(h.toggle)
    expect(h.lampPlanArgs).toEqual(['k', h.plan.items, true])
    expect(h.map.plugs).toHaveLength(1)
    expect(h.map.plugs[0]).toMatchObject({ id: 'prise', name: 'prise', on: false })
    h.plan.items = { prise: { x: 9, y: 10 } }
    mount()
    expect(h.map.plugs[0]).toMatchObject({ x: 9, y: 10 })
  })
  it('sur téléphone, les lampes ne sont pas relues', () => {
    h.mobile = true
    mount()
    expect(h.lampPlanArgs[2]).toBe(false)
  })
  it('sans lampe ni prise : aucune', () => {
    mount()
    expect(h.map.lamps).toEqual([])
    expect(h.map.plugs).toEqual([])
  })

  it('déplacer la cage entraîne la lampe de la cage et la prise, pas les autres lampes', () => {
    h.lamps = [
      { id: '26', name: 'P', on: true, reachable: true, x: 10, y: 10, indoor: false },
      { id: '3', name: 'Q', on: true, reachable: true, x: 50, y: 50, indoor: true },
    ]
    h.plug = { alias: 'prise', on: false }
    h.plan.items = { prise: { x: 20, y: 20 } }
    mount()
    act(() => h.map.onMoveCage(105, 90))
    expect(h.plan.moveCage).toHaveBeenCalledWith(105, 90)
    expect(h.plan.moveItem).toHaveBeenCalledWith('26', 15, 0)
    expect(h.plan.moveItem).toHaveBeenCalledWith('prise', 25, 10)
    expect(h.plan.moveItem).toHaveBeenCalledTimes(2)
  })
  it('sans lampe ni prise, seule la cage bouge ; sans déplacement, rien', () => {
    mount()
    act(() => h.map.onMoveCage(105, 90))
    expect(h.plan.moveCage).toHaveBeenCalled()
    expect(h.plan.moveItem).not.toHaveBeenCalled()
    h.plan.moveCage.mockClear()
    act(() => h.map.onMoveCage(100, 100))
    expect(h.plan.moveCage).not.toHaveBeenCalled()
  })

  it('choisir une caméra du plan : un second clic la désélectionne, vide aussi', () => {
    mount()
    act(() => h.map.onSelectCamera('c-in'))
    expect(h.map.selectedCameraId).toBe('c-in')
    act(() => h.map.onSelectCamera('c-in'))
    expect(h.map.selectedCameraId).toBe('')
    act(() => h.map.onSelectCamera('c-out'))
    act(() => h.map.onSelectCamera(''))
    expect(h.map.selectedCameraId).toBe('')
  })
  it('choisir une haie : même logique ; un arbre : choix libre', () => {
    mount()
    act(() => h.map.onSelectHedge('h1'))
    expect(h.map.selectedHedgeId).toBe('h1')
    act(() => h.map.onSelectHedge('h1'))
    expect(h.map.selectedHedgeId).toBe('')
    act(() => h.map.onSelectHedge('h2'))
    act(() => h.map.onSelectHedge(''))
    expect(h.map.selectedHedgeId).toBe('')
    act(() => h.map.onSelectTree('t1'))
    expect(h.map.selectedTreeId).toBe('t1')
  })
  it('les actions de la carte sont celles du plan', () => {
    mount()
    expect(h.map.onLink).toBe(h.plan.link)
    expect(h.map.onMoveOffset).toBe(h.plan.moveOffset)
    expect(h.map.onMoveCamera).toBe(h.plan.moveCamera)
    expect(h.map.onMoveLamp).toBe(h.plan.moveItem)
    expect(h.map.gates.length).toBeGreaterThan(0)
  })
})
