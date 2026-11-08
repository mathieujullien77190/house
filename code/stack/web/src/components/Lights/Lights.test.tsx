import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { flush } from '@/test/fetch'
import { setDesktop } from '@/test/viewport'
import type { HueAutomation, HueRoom } from '@/types'
import Lights from './Lights'
import { fromHousePlan, waitingSlot } from '@/components/MapPlan/helpers'
import { LAMP_POSITIONS, LEGACY_STORAGE_KEY, PLAN_LAMP_POSITION } from './constants'

/* eslint-disable @typescript-eslint/no-explicit-any -- doubles de composants : les props sont inspectées librement */
const ui = vi.hoisted(() => ({
  plan: null as any,
  panel: null as any,
  state: null as any,
  fresh: () => ({
    items: {} as Record<string, { x: number; y: number }>,
    trees: [{ id: 't' }],
    hedges: [{ id: 'h' }],
    cage: { x: 1, y: 2, w: 3, h: 4 },
    offsets: { garage: { dx: 1, dy: 1 } },
    moveItem: vi.fn(),
  }),
}))

vi.mock('@/components/MapPlan', () => ({
  default: (props: unknown) => {
    ui.plan = props
    return <div data-testid="plan" />
  },
}))
vi.mock('@/lib/usePlan', () => ({ usePlan: () => ui.state }))
vi.mock('@house/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@house/ui')>()),
  LightsPanel: (props: { lampExtra: (light: { id: string; on: boolean }) => ReactNode }) => {
    ui.panel = props
    return (
      <div data-testid="panel">
        <span data-testid="extra-26">{props.lampExtra({ id: '26', on: true })}</span>
        <span data-testid="extra-1">{props.lampExtra({ id: '1', on: true })}</span>
      </div>
    )
  },
}))
vi.mock('@/components/FadeButton', () => ({ default: () => <i data-testid="fade" /> }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchLights: vi.fn(),
  fetchSensors: vi.fn(),
  fetchAutomations: vi.fn(),
  fetchLampPositions: vi.fn(),
  setHue: vi.fn(),
}))
const api = await import('@/lib/api')

const light = (id: string, over: Record<string, unknown> = {}) => ({ id, name: `L${id}`, on: false, bri: 100, reachable: true, ...over })
const rooms = (...lights: ReturnType<typeof light>[]): HueRoom[] => [{ id: 'r', name: 'R', on: false, bri: null, lights } as HueRoom]
const automation = (enabled: boolean): HueAutomation => ({ id: String(enabled), name: 'Soir', enabled, kind: 'horaire', lines: ['x'] })

beforeEach(() => {
  vi.useFakeTimers()
  setDesktop(true)
  ui.plan = null
  ui.panel = null
  ui.state = ui.fresh()
  localStorage.clear()
  vi.mocked(api.fetchLights).mockResolvedValue(
    rooms(light('15'), light('9', { on: true }), light('26'), light('10', { reachable: false }), light('999', { reachable: false })),
  )
  vi.mocked(api.fetchSensors).mockResolvedValue([])
  vi.mocked(api.fetchAutomations).mockResolvedValue([])
  vi.mocked(api.fetchLampPositions).mockResolvedValue({})
})
afterEach(() => vi.useRealTimers())

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('Lights : états', () => {
  it.each([
    ['chargement', () => new Promise<never>(() => undefined), /Chargement/],
    ['pont non configuré', () => Promise.reject(new api.ApiError(503, 'x')), /pas configuré/],
    ['erreur', () => Promise.reject(new Error('x')), /n’a pas répondu/],
  ])('%s', async (_name, result, text) => {
    vi.mocked(api.fetchLights).mockImplementation(result as never)
    render(<Lights apiKey="k" />)
    await settle()
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('aucune lampe', async () => {
    vi.mocked(api.fetchLights).mockResolvedValue([])
    render(<Lights apiKey="k" />)
    await settle()
    expect(screen.getByText(/Aucune lampe/)).toBeInTheDocument()
  })

  it('sur téléphone : la liste des lampes, pas de carte', async () => {
    setDesktop(false)
    render(<Lights apiKey="k" />)
    await settle()
    expect(screen.getByTestId('panel')).toBeInTheDocument()
    expect(screen.queryByTestId('plan')).toBeNull()
  })

  it('sur téléphone, un message d’erreur n’a pas de bouton retour', async () => {
    setDesktop(false)
    vi.mocked(api.fetchLights).mockRejectedValue(new Error('x'))
    render(<Lights apiKey="k" />)
    await settle()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('une erreur passagère garde l’écran avec un bandeau', async () => {
    render(<Lights apiKey="k" />)
    await settle()
    vi.mocked(api.fetchLights).mockRejectedValue(new Error('x'))
    await settle(5000)
    expect(screen.getByText(/n’a pas répondu/)).toBeInTheDocument()
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })

  it('un détecteur illisible ne bloque pas les lampes', async () => {
    vi.mocked(api.fetchSensors).mockRejectedValue(new Error('x'))
    render(<Lights apiKey="k" />)
    await settle()
    expect(screen.getByTestId('panel')).toBeInTheDocument()
  })

  it('ignore les réponses après démontage', async () => {
    let ok: (r: HueRoom[]) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchLights)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const { unmount } = render(<Lights apiKey="k" />)
    await settle(5000)
    unmount()
    await act(async () => {
      ok(rooms(light('15')))
      ko(new Error('x'))
      await flush()
    })
  })
})

describe('Lights : automatisations', () => {
  it('montre le compte des règles actives', async () => {
    vi.mocked(api.fetchAutomations).mockResolvedValue([automation(true), automation(false)])
    render(<Lights apiKey="k" />)
    await settle()
    expect(screen.getByText('1/2 actives')).toBeInTheDocument()
  })
  it('rien sans règle ; une erreur de lecture est ignorée ; relue chaque minute', async () => {
    vi.mocked(api.fetchAutomations).mockRejectedValue(new Error('x'))
    render(<Lights apiKey="k" />)
    await settle(60_000)
    expect(screen.queryByText(/actives/)).toBeNull()
    expect(vi.mocked(api.fetchAutomations).mock.calls.length).toBeGreaterThan(1)
  })
  it('ignore la réponse après démontage', async () => {
    let ok: (r: HueAutomation[]) => void = () => undefined
    vi.mocked(api.fetchAutomations).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    const { unmount } = render(<Lights apiKey="k" />)
    unmount()
    await act(async () => {
      ok([automation(true)])
      await flush()
    })
  })
})

describe('Lights : commandes', () => {
  it('le bouton d’extinction en douceur n’est que sur la lampe 26', async () => {
    render(<Lights apiKey="k" />)
    await settle()
    expect(screen.getByTestId('extra-26').querySelector('[data-testid=fade]')).not.toBeNull()
    expect(screen.getByTestId('extra-1').querySelector('[data-testid=fade]')).toBeNull()
  })

  it('une lampe : change, puis l’écran suit', async () => {
    const updated = rooms(light('15', { on: true }))
    vi.mocked(api.setHue).mockResolvedValue(updated)
    render(<Lights apiKey="k" />)
    await settle()
    act(() => ui.panel.onDraft('light:15', 40))
    expect(ui.panel.drafts['light:15']).toBe(40)
    act(() => ui.panel.onLight('15', { on: true }))
    expect(ui.panel.busy).toBe('light:15')
    await settle()
    expect(api.setHue).toHaveBeenCalledWith('k', 'lights', '15', { on: true })
    expect(ui.panel.busy).toBe('')
    expect(ui.panel.drafts).toEqual({})
  })

  it('un échec de commande passe en erreur ou en indisponible', async () => {
    vi.mocked(api.setHue).mockRejectedValue(new Error('x'))
    render(<Lights apiKey="k" />)
    await settle()
    act(() => ui.panel.onLight('15', { on: true }))
    await settle()
    expect(screen.getByText(/n’a pas répondu/)).toBeInTheDocument()
  })

  it('une zone se commande lampe par lampe, sans toucher les injoignables', async () => {
    vi.mocked(api.setHue).mockImplementation(async (_k, _kind, id) => rooms(light(id, { on: true })))
    render(<Lights apiKey="k" />)
    await settle()
    act(() => ui.panel.onRoom('sdb', { on: true }))
    await settle()
    expect(vi.mocked(api.setHue).mock.calls.map((c) => c[2])).toEqual(['9'])
    // zone inconnue : rien à faire
    vi.mocked(api.setHue).mockClear()
    act(() => ui.panel.onRoom('nulle-part', { on: true }))
    await settle()
    expect(api.setHue).not.toHaveBeenCalled()
  })

  it('une lampe qui échoue dans une zone ne bloque pas les suivantes, l’erreur est rendue à la fin', async () => {
    vi.mocked(api.fetchLights).mockResolvedValue(rooms(light('13'), light('14'), light('3')))
    vi.mocked(api.setHue).mockImplementation(async (_k, _kind, id) => {
      if (id === '14') throw new Error('x')
      return rooms(light(id, { on: true }))
    })
    render(<Lights apiKey="k" />)
    await settle()
    act(() => ui.panel.onRoom('cuisine', { on: true }))
    await settle()
    expect(vi.mocked(api.setHue).mock.calls.map((c) => c[2])).toEqual(['13', '14', '3'])
    expect(screen.getByText(/n’a pas répondu/)).toBeInTheDocument()
  })

  it('une zone dont toutes les lampes échouent : aucune mise à jour, erreur', async () => {
    vi.mocked(api.setHue).mockRejectedValue(new Error('x'))
    render(<Lights apiKey="k" />)
    await settle()
    act(() => ui.panel.onRoom('sdb', { on: true }))
    await settle()
    expect(screen.getByText(/n’a pas répondu/)).toBeInTheDocument()
  })

  it('tout allumer : les zones de la maison, pas la volière ni les lampes à placer', async () => {
    vi.mocked(api.setHue).mockImplementation(async (_k, _kind, id) => rooms(light(id, { on: true })))
    render(<Lights apiKey="k" />)
    await settle()
    act(() => ui.panel.onAll(true))
    await settle()
    expect(
      vi
        .mocked(api.setHue)
        .mock.calls.map((c) => c[2])
        .sort(),
    ).toEqual(['15', '9'])
  })

  it('toucher une ampoule du plan bascule la lampe joignable seulement', async () => {
    vi.mocked(api.setHue).mockResolvedValue(rooms(light('15', { on: true })))
    render(<Lights apiKey="k" />)
    await settle()
    act(() => ui.plan.onToggleLamp('15'))
    await settle()
    expect(api.setHue).toHaveBeenCalledWith('k', 'lights', '15', { on: true })
    vi.mocked(api.setHue).mockClear()
    act(() => ui.plan.onToggleLamp('999'))
    act(() => ui.plan.onToggleLamp('inconnue'))
    await settle()
    expect(api.setHue).not.toHaveBeenCalled()
  })
})

const lampOf = (id: string) => ui.plan.lamps.find((l: { id: string }) => l.id === id)

describe('Lights : la carte et les lampes', () => {
  it('la même carte que les caméras, en mode lumière, avec le plan de l’API', async () => {
    render(<Lights apiKey="k" />)
    await settle()
    expect(ui.plan).toMatchObject({
      mode: 'lights',
      trees: ui.state.trees,
      hedges: ui.state.hedges,
      cage: ui.state.cage,
      offsets: ui.state.offsets,
    })
    expect(ui.plan.onMoveLamp).toBe(ui.state.moveItem)
    expect(ui.plan.gates.length).toBeGreaterThan(0)
    expect(ui.plan.lamps.map((l: { id: string }) => l.id)).toEqual(['9', '10', '15', '26', '999'])
  })

  it('une lampe injoignable est montrée éteinte, avec sa luminosité', async () => {
    render(<Lights apiKey="k" />)
    await settle()
    expect(lampOf('9')).toMatchObject({ on: true, reachable: true, brightness: 100 })
    expect(lampOf('10')).toMatchObject({ on: false, reachable: false })
  })

  it('la place vient du plan de l’API d’abord', async () => {
    ui.state.items = { '15': { x: 7, y: 8 } }
    vi.mocked(api.fetchLampPositions).mockResolvedValue({ '15': { x: 100, y: 50 } })
    render(<Lights apiKey="k" />)
    await settle()
    expect(lampOf('15')).toMatchObject({ x: 7, y: 8, indoor: true })
    expect(lampOf('15')).not.toHaveProperty('waiting')
  })

  it('sinon l’ancienne position de /hue/positions, convertie, sans rien écrire ni effacer', async () => {
    vi.mocked(api.fetchLampPositions).mockResolvedValue({ '15': { x: 100, y: 50 } })
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ '15': { x: 1, y: 1 } }))
    render(<Lights apiKey="k" />)
    await settle()
    expect(lampOf('15')).toMatchObject(fromHousePlan(100, 50))
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull()
    expect(ui.state.moveItem).not.toHaveBeenCalled()
  })

  it('sinon la copie du navigateur, puis LAMP_POSITIONS ; une lampe inconnue attend', async () => {
    vi.mocked(api.fetchLampPositions).mockRejectedValue(new Error('x'))
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ '9': { x: 10, y: 10 } }))
    render(<Lights apiKey="k" />)
    await settle()
    expect(lampOf('9')).toMatchObject(fromHousePlan(10, 10))
    expect(lampOf('15')).toMatchObject(fromHousePlan(LAMP_POSITIONS['15'].x, LAMP_POSITIONS['15'].y))
    expect(lampOf('999')).toMatchObject({ ...waitingSlot(0), waiting: true })
  })

  it('une ancienne position dans la zone « À placer » compte pour non placée', async () => {
    vi.mocked(api.fetchLampPositions).mockResolvedValue({ '15': { x: 600, y: 10 } })
    render(<Lights apiKey="k" />)
    await settle()
    expect(lampOf('15')).toMatchObject({ waiting: true })
  })

  it('la lampe de la cage a sa place de départ sur la carte', async () => {
    render(<Lights apiKey="k" />)
    await settle()
    expect(lampOf('26')).toMatchObject(PLAN_LAMP_POSITION)
    expect(lampOf('26').indoor).toBeUndefined()
  })

  it('la copie du navigateur illisible est ignorée', async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, '[')
    render(<Lights apiKey="k" />)
    await settle()
    expect(lampOf('15')).toMatchObject(fromHousePlan(LAMP_POSITIONS['15'].x, LAMP_POSITIONS['15'].y))
  })
})
