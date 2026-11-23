import { act, render } from '@testing-library/react'
import * as lan from '@/lib/lanApi'
import { LanError } from '@/lib/lanApi'
import { POLL_MS, RETRY_MS } from './constants'
import ChezMatou from './ChezMatou'
import type { ChezMatouUIProps, LanState } from './types'

const h = vi.hoisted(() => ({ ui: null as ChezMatouUIProps | null, mobile: false }))

vi.mock('./UI', () => ({
  default: (p: ChezMatouUIProps) => {
    h.ui = p
    return null
  },
}))
vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/lib/lanApi', async (original) => ({
  ...(await original<object>()),
  readLanKey: vi.fn(),
  fetchLanState: vi.fn(),
  fetchLanToken: vi.fn(),
  sendLanShutter: vi.fn(),
  sendLanLight: vi.fn(),
  sendLanAc: vi.fn(),
}))

const state = (): LanState => ({
  access: { cameras: true, shutters: true, lights: true, ac: true },
  cameras: [{ id: 'voliere-interieur', name: 'Intérieur', orientation: 'landscape' }],
  shutters: [{ id: 's1', name: 'Cuisine', lastCommand: 'up' }],
  lights: [{ id: 'r', name: 'R', on: true, bri: null, lights: [{ id: '15', name: 'L', on: true, bri: 1, reachable: true }] }],
  ac: [],
})
const ui = (): ChezMatouUIProps => {
  if (!h.ui) throw new Error('UI non rendue')
  return h.ui
}

const mount = async () => {
  render(<ChezMatou />)
  await act(async () => undefined)
}

beforeEach(() => {
  h.mobile = false
  vi.mocked(lan.readLanKey).mockReturnValue('k')
  vi.mocked(lan.fetchLanState).mockResolvedValue(state())
  vi.mocked(lan.fetchLanToken).mockResolvedValue('jeton')
  vi.mocked(lan.sendLanShutter).mockResolvedValue(undefined)
  vi.mocked(lan.sendLanLight).mockResolvedValue(undefined)
  vi.mocked(lan.sendLanAc).mockResolvedValue(undefined)
})
afterEach(() => vi.useRealTimers())

describe('ChezMatou : mode télé', () => {
  afterEach(() => sessionStorage.clear())
  it('?tv=1 : la page porte la classe tv, retirée au démontage', async () => {
    sessionStorage.setItem('house-tv', '1')
    const { unmount } = render(<ChezMatou />)
    await act(async () => undefined)
    expect(ui().tv).toBe(true)
    expect(document.documentElement.classList.contains('tv')).toBe(true)
    unmount()
    expect(document.documentElement.classList.contains('tv')).toBe(false)
  })
  it('sans ?tv=1 : pas de classe', async () => {
    await mount()
    expect(ui().tv).toBe(false)
    expect(document.documentElement.classList.contains('tv')).toBe(false)
  })
})

describe('ChezMatou', () => {
  it('sans clé : verrouillée, rien n’est demandé ni envoyé', async () => {
    vi.mocked(lan.readLanKey).mockReturnValue(null)
    await mount()
    expect(ui().problem).toBe('locked')
    expect(lan.fetchLanState).not.toHaveBeenCalled()
    ui().onShutter('s1', 'up')
    ui().onRoom('r', true)
    ui().onLight('15', true)
    ui().onAc('salon', { on: true })
    expect(lan.sendLanShutter).not.toHaveBeenCalled()
  })

  it('lit l’état, le jeton, et fabrique les adresses de flux', async () => {
    await mount()
    expect(ui().problem).toBeNull()
    expect(ui().state?.cameras).toHaveLength(1)
    expect(ui().shutters[0].lastCommand).toBe('up')
    expect(ui().streamUrl('voliere-interieur')).toBe('/lan/stream/voliere-interieur?t=jeton')
    expect(ui().streamUrl('voliere-interieur', true)).toContain('quality=hd')
    h.mobile = true
    await mount()
    expect(ui().streamUrl('c')).toContain('screen=mobile')
  })

  it('sans caméras permises : pas de jeton ; échec du jeton ignoré', async () => {
    vi.mocked(lan.fetchLanState).mockResolvedValue({ ...state(), cameras: null })
    await mount()
    expect(lan.fetchLanToken).not.toHaveBeenCalled()
    expect(ui().streamUrl('c')).toBeNull()
    vi.mocked(lan.fetchLanState).mockResolvedValue(state())
    vi.mocked(lan.fetchLanToken).mockRejectedValue(new Error('x'))
    await mount()
    expect(ui().streamUrl('c')).toBeNull()
  })

  it('un jeton qui arrive après le démontage est ignoré', async () => {
    let resolve: (value: string) => void = () => undefined
    vi.mocked(lan.fetchLanToken).mockReturnValue(new Promise((ok) => (resolve = ok)))
    const view = render(<ChezMatou />)
    await act(async () => undefined)
    view.unmount()
    await act(async () => resolve('tard'))
  })

  it('les erreurs de l’API deviennent un problème', async () => {
    vi.mocked(lan.fetchLanState).mockRejectedValueOnce(new LanError('disabled'))
    await mount()
    expect(ui().problem).toBe('disabled')
    expect(ui().state).toBeNull()
    vi.mocked(lan.fetchLanState).mockRejectedValueOnce(new Error('x'))
    await mount()
    expect(ui().problem).toBe('unreachable')
  })

  it('relit l’état toutes les 5 s', async () => {
    vi.useFakeTimers()
    render(<ChezMatou />)
    await act(async () => undefined)
    await act(async () => void vi.advanceTimersByTime(POLL_MS))
    expect(lan.fetchLanState).toHaveBeenCalledTimes(2)
  })

  it('un flux en erreur : jeton retiré puis redemandé', async () => {
    vi.useFakeTimers()
    render(<ChezMatou />)
    await act(async () => undefined)
    act(() => ui().onStreamError())
    expect(ui().streamUrl('c')).toBeNull()
    await act(async () => void vi.advanceTimersByTime(RETRY_MS))
    expect(lan.fetchLanToken).toHaveBeenCalledTimes(2)
    expect(ui().streamUrl('c')).not.toBeNull()
  })

  it('ouvre et ferme une caméra', async () => {
    await mount()
    act(() => ui().onOpenCamera('voliere-interieur'))
    expect(ui().opened).toBe('voliere-interieur')
    act(() => ui().onCloseCamera())
    expect(ui().opened).toBeNull()
  })

  it('les ordres partent avec la clé, puis l’état est relu', async () => {
    await mount()
    await act(async () => ui().onShutter('s1', 'down'))
    expect(lan.sendLanShutter).toHaveBeenCalledWith('k', 's1', 'down')
    await act(async () => ui().onLight('15', true))
    expect(lan.sendLanLight).toHaveBeenCalledWith('k', '15', true)
    await act(async () => ui().onAc('salon', { on: true }))
    expect(lan.sendLanAc).toHaveBeenCalledWith('k', 'salon', { on: true })
    expect(ui().busy).toBeNull()
    expect(ui().error).toBeNull()
  })

  it('un ordre de zone allume chaque lampe de la zone ; zone inconnue : aucun envoi', async () => {
    await mount()
    const zone = ui().rooms[0]
    await act(async () => ui().onRoom(zone.id, false))
    expect(lan.sendLanLight).toHaveBeenCalledWith('k', zone.lights[0].id, false)
    vi.mocked(lan.sendLanLight).mockClear()
    await act(async () => ui().onRoom('fantome', true))
    expect(lan.sendLanLight).not.toHaveBeenCalled()
  })

  it('un ordre refusé : l’erreur s’affiche', async () => {
    vi.mocked(lan.sendLanShutter).mockRejectedValue(new Error('non'))
    await mount()
    await act(async () => ui().onShutter('s1', 'up'))
    expect(ui().error).toBe('failed')
    expect(ui().busy).toBeNull()
  })
})
