import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { ShutterInfo, ShuttersState } from '@/types'
import ShuttersPanel from './ShuttersPanel'
import {
  AUTO_CLOSE_LABEL,
  AUTO_ERROR_TEXT,
  AUTO_OPEN_LABEL,
  LOADING_TEXT,
  MOCK_TEXT,
  NEVER_TEXT,
  NOT_CONFIGURED_TEXT,
  HALF_LABEL,
  HALF_RUNNING_TEXT,
  POLL_MS,
  POLL_RUNNING_MS,
  SEND_ERROR_TEXT,
  UNAVAILABLE_TEXT,
} from './constants'
import { lastText } from './helpers'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchShutters: vi.fn(),
  closeShutterHalf: vi.fn(),
  sendShutter: vi.fn(),
  setShutterAuto: vi.fn(),
}))
const api = await import('@/lib/api')

const shutter = (over: Partial<ShutterInfo> = {}): ShutterInfo => ({
  id: '1',
  name: 'Volet PC',
  lastCommand: null,
  lastAt: null,
  auto: { open: false, close: true },
  ...over,
})
const state = (shutters: ShutterInfo[], mock = true): ShuttersState => ({ mock, shutters })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000_000)
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

describe('lastText', () => {
  it('jamais d’ordre, ou le dernier ordre avec son heure', () => {
    expect(lastText(shutter())).toBe(NEVER_TEXT)
    expect(lastText(shutter({ lastCommand: 'up', lastAt: null }))).toBe(NEVER_TEXT)
    expect(lastText(shutter({ lastCommand: 'down', lastAt: 1_000_000_000 }))).toMatch(/^Dernier ordre : Descendre, à \d{2}:\d{2}$/)
  })
})

describe('ShuttersPanel', () => {
  it('montre le chargement puis les volets, avec la simulation', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(
      state([shutter(), shutter({ id: '2', name: 'Volet salon', auto: null, lastCommand: 'stop', lastAt: 1_000_000_000 })]),
    )
    render(<ShuttersPanel apiKey="k" />)
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
    await settle()
    expect(screen.queryByText(LOADING_TEXT)).toBeNull()
    expect(screen.getByText(MOCK_TEXT)).toBeInTheDocument()
    expect(screen.getByText('Volet PC')).toBeInTheDocument()
    expect(screen.getByText('Volet salon')).toBeInTheDocument()
    // seul le volet qui a l'action automatique a ses deux cases
    expect(screen.getAllByLabelText(AUTO_OPEN_LABEL)).toHaveLength(1)
    expect(screen.getByLabelText(AUTO_CLOSE_LABEL)).toBeChecked()
    expect(screen.getByLabelText(AUTO_OPEN_LABEL)).not.toBeChecked()
  })

  it('sans simulation, pas d’avertissement', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter()], false))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    expect(screen.queryByText(MOCK_TEXT)).toBeNull()
  })

  it('503 : aucun volet configuré ; autre erreur : ne répondent pas', async () => {
    const { ApiError } = await import('@/lib/api')
    vi.mocked(api.fetchShutters).mockRejectedValue(new ApiError(503, 'x'))
    const first = render(<ShuttersPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(NOT_CONFIGURED_TEXT)).toBeInTheDocument()
    first.unmount()
    vi.mocked(api.fetchShutters).mockRejectedValue(new Error('réseau'))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })

  it('relit la liste à intervalle régulier, et plus après le démontage', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter()]))
    const view = render(<ShuttersPanel apiKey="k" />)
    await settle()
    await settle(POLL_MS)
    expect(api.fetchShutters).toHaveBeenCalledTimes(2)
    view.unmount()
    await settle(POLL_MS)
    expect(api.fetchShutters).toHaveBeenCalledTimes(2)
  })

  it('une réponse qui arrive après le démontage est ignorée', async () => {
    let resolve: (value: ShuttersState) => void = () => undefined
    let reject: (reason: unknown) => void = () => undefined
    vi.mocked(api.fetchShutters).mockReturnValueOnce(new Promise((done) => (resolve = done)))
    const first = render(<ShuttersPanel apiKey="k" />)
    first.unmount()
    resolve(state([shutter()]))
    await settle()
    vi.mocked(api.fetchShutters).mockReturnValueOnce(new Promise((_done, fail) => (reject = fail)))
    const second = render(<ShuttersPanel apiKey="k" />)
    second.unmount()
    reject(new Error('tard'))
    await settle()
    expect(screen.queryByText('Volet PC')).toBeNull()
  })

  it('un ordre : le bouton se bloque, le volet est mis à jour, les autres restent', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter(), shutter({ id: '2', name: 'Volet salon' })]))
    let done: (value: ShutterInfo) => void = () => undefined
    vi.mocked(api.sendShutter).mockReturnValue(new Promise((resolve) => (done = resolve)))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getAllByRole('button', { name: '▲ Monter' })[0])
    expect(api.sendShutter).toHaveBeenCalledWith('k', '1', 'up')
    expect(screen.getAllByRole('button', { name: '▲ Monter' })[0]).toBeDisabled()
    expect(screen.getAllByRole('button', { name: '▲ Monter' })[1]).not.toBeDisabled()
    done(shutter({ lastCommand: 'up', lastAt: 1_000_000_000 }))
    await settle()
    expect(screen.getAllByRole('button', { name: '▲ Monter' })[0]).not.toBeDisabled()
    expect(screen.getByText(/Dernier ordre : Monter/)).toBeInTheDocument()
  })

  it('un ordre qui échoue affiche l’erreur, qui s’efface à l’ordre suivant', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter()]))
    vi.mocked(api.sendShutter)
      .mockRejectedValueOnce(new Error('502'))
      .mockResolvedValueOnce(shutter({ lastCommand: 'stop', lastAt: 1_000_000_000 }))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: '■ Stop' }))
    await settle()
    expect(screen.getByText(SEND_ERROR_TEXT)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '■ Stop' }))
    await settle()
    expect(screen.queryByText(SEND_ERROR_TEXT)).toBeNull()
  })

  it('un ordre dont la réponse arrive après un échec de lecture ne casse rien', async () => {
    vi.mocked(api.fetchShutters)
      .mockResolvedValueOnce(state([shutter()]))
      .mockRejectedValue(new Error('réseau'))
    let done: (value: ShutterInfo) => void = () => undefined
    vi.mocked(api.sendShutter).mockReturnValue(new Promise((resolve) => (done = resolve)))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: '▼ Descendre' }))
    await settle(POLL_MS)
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
    done(shutter())
    await settle()
    expect(screen.queryByText('Volet PC')).toBeNull()
  })

  it('« Fermer à moitié » : seulement pour un volet qui a un temps de fermeture, bloqué pendant la course', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(
      state([shutter({ closeSeconds: 19 }), shutter({ id: '2', name: 'Volet salon', closeSeconds: 19, halfRunning: true }), shutter({ id: '3', name: 'Volet porte' })]),
    )
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    const buttons = screen.getAllByRole('button', { name: HALF_LABEL })
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).not.toBeDisabled()
    expect(buttons[1]).toBeDisabled()
    expect(screen.getAllByText(HALF_RUNNING_TEXT)).toHaveLength(1)
  })

  it('« Fermer à moitié » : le volet est mis à jour, l’erreur s’affiche, et la liste est relue plus vite en route', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter({ closeSeconds: 19 }), shutter({ id: '2', name: 'Volet salon', closeSeconds: 19 })]))
    vi.mocked(api.closeShutterHalf)
      .mockRejectedValueOnce(new Error('502'))
      .mockResolvedValueOnce(shutter({ closeSeconds: 19, halfRunning: true, lastCommand: 'up', lastAt: 1_000_000_000 }))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getAllByRole('button', { name: HALF_LABEL })[0])
    expect(api.closeShutterHalf).toHaveBeenCalledWith('k', '1')
    await settle()
    expect(screen.getByText(SEND_ERROR_TEXT)).toBeInTheDocument()
    // l'API, relue, dit que la course est en cours
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter({ closeSeconds: 19, halfRunning: true }), shutter({ id: '2', name: 'Volet salon', closeSeconds: 19 })]))
    fireEvent.click(screen.getAllByRole('button', { name: HALF_LABEL })[0])
    await settle()
    expect(screen.queryByText(SEND_ERROR_TEXT)).toBeNull()
    expect(screen.getByText(HALF_RUNNING_TEXT)).toBeInTheDocument()
    const reads = vi.mocked(api.fetchShutters).mock.calls.length
    await settle(POLL_RUNNING_MS)
    expect(vi.mocked(api.fetchShutters).mock.calls.length).toBe(reads + 1)
  })

  it('« Fermer à moitié » dont la réponse arrive après une liste perdue ne casse rien', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValueOnce(state([shutter({ closeSeconds: 19 })])).mockRejectedValue(new Error('réseau'))
    let done: (value: ShutterInfo) => void = () => undefined
    vi.mocked(api.closeShutterHalf).mockReturnValue(new Promise((resolve) => (done = resolve)))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByRole('button', { name: HALF_LABEL }))
    await settle(POLL_MS)
    done(shutter())
    await settle()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })

  it('une case : change tout de suite et envoie l’option', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(
      state([
        shutter(),
        shutter({ id: '2', name: 'Volet salon', auto: { open: true, close: true } }),
        shutter({ id: '3', name: 'Volet porte', auto: null }),
      ]),
    )
    vi.mocked(api.setShutterAuto).mockResolvedValue(undefined)
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getAllByLabelText(AUTO_OPEN_LABEL)[0])
    expect(api.setShutterAuto).toHaveBeenCalledWith('k', '1', { open: true })
    expect(screen.getAllByLabelText(AUTO_OPEN_LABEL)[0]).toBeChecked()
    fireEvent.click(screen.getAllByLabelText(AUTO_CLOSE_LABEL)[1])
    expect(api.setShutterAuto).toHaveBeenCalledWith('k', '2', { close: false })
    await settle()
    expect(screen.getAllByLabelText(AUTO_CLOSE_LABEL)[1]).not.toBeChecked()
    expect(screen.queryByText(AUTO_ERROR_TEXT)).toBeNull()
  })

  it('une case refusée par l’API revient en arrière avec un message', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue(state([shutter()]))
    vi.mocked(api.setShutterAuto).mockRejectedValue(new Error('404'))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByLabelText(AUTO_OPEN_LABEL))
    await settle()
    expect(screen.getByLabelText(AUTO_OPEN_LABEL)).not.toBeChecked()
    expect(screen.getByText(AUTO_ERROR_TEXT)).toBeInTheDocument()
  })

  it('une case changée pendant que la liste est perdue ne casse rien', async () => {
    vi.mocked(api.fetchShutters)
      .mockResolvedValueOnce(state([shutter()]))
      .mockRejectedValue(new Error('réseau'))
    let fail: (reason: unknown) => void = () => undefined
    vi.mocked(api.setShutterAuto).mockReturnValue(new Promise((_resolve, reject) => (fail = reject)))
    render(<ShuttersPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByLabelText(AUTO_OPEN_LABEL))
    await settle(POLL_MS)
    fail(new Error('404'))
    await settle()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })
})
