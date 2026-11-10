import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { flush } from '@/test/fetch'
import { setDesktop } from '@/test/viewport'
import type { HueAutomation, HueRoom } from '@/types'
import Lights from './Lights'

/* eslint-disable @typescript-eslint/no-explicit-any -- doubles de composants : les props sont inspectées librement */
const ui = vi.hoisted(() => ({ panel: null as any, fadeLevel: null as number | null }))

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
vi.mock('@/lib/useFade', () => ({ useFade: () => ({ fading: ui.fadeLevel !== null, remaining: null, level: ui.fadeLevel, busy: false, failed: false, toggle: vi.fn() }) }))
vi.mock('@/components/FadeButton', () => ({ default: () => <i data-testid="fade" /> }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchLights: vi.fn(),
  fetchSensors: vi.fn(),
  fetchAutomations: vi.fn(),
  setHue: vi.fn(),
}))
const api = await import('@/lib/api')

const light = (id: string, over: Record<string, unknown> = {}) => ({ id, name: `L${id}`, on: false, bri: 100, reachable: true, ...over })
const rooms = (...lights: ReturnType<typeof light>[]): HueRoom[] => [{ id: 'r', name: 'R', on: false, bri: null, lights } as HueRoom]
const automation = (enabled: boolean): HueAutomation => ({ id: String(enabled), name: 'Soir', enabled, kind: 'horaire', lines: ['x'] })

beforeEach(() => {
  vi.useFakeTimers()
  setDesktop(true)
  ui.panel = null
  ui.fadeLevel = null
  vi.mocked(api.fetchLights).mockResolvedValue(
    rooms(light('15'), light('9', { on: true }), light('26'), light('10', { reachable: false }), light('999', { reachable: false })),
  )
  vi.mocked(api.fetchSensors).mockResolvedValue([])
  vi.mocked(api.fetchAutomations).mockResolvedValue([])
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

  it('pendant l’extinction en douceur, le curseur de la perruche suit la descente (le pont annonce tout de suite la cible)', async () => {
    render(<Lights apiKey="k" />)
    await settle()
    expect(ui.panel.drafts['light:26']).toBeUndefined()
    ui.fadeLevel = 62
    act(() => ui.panel.onDraft('light:15', 40))
    expect(ui.panel.drafts['light:26']).toBe(62)
    // les autres curseurs gardent leur brouillon
    expect(ui.panel.drafts['light:15']).toBe(40)
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
    expect(vi.mocked(api.setHue).mock.calls.every((c) => c[3].on === true && c[3].bri === 254)).toBe(true)
  })

  it('tout éteindre : seulement { on: false }', async () => {
    vi.mocked(api.setHue).mockImplementation(async (_k, _kind, id) => rooms(light(id)))
    render(<Lights apiKey="k" />)
    await settle()
    act(() => ui.panel.onAll(false))
    await settle()
    expect(vi.mocked(api.setHue).mock.calls.map((c) => c[3])).toEqual([{ on: false }, { on: false }])
  })
})
