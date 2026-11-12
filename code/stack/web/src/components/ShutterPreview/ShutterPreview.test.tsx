import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { ShutterInfo } from '@/types'
import ShutterPreview from './ShutterPreview'
import { CLOSED_BORDER_CLASS, LOADING_TEXT, OPEN_BORDER_CLASS, POLL_MS, POLL_RUNNING_MS, UNKNOWN_TEXT } from './constants'

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
  name: 'Volet cuisine',
  lastCommand: null,
  lastAt: null,
  auto: { open: false, close: true },
  ...over,
})

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('ShutterPreview', () => {
  it('montre le chargement, puis le bloc du volet (le même que l’onglet Volet)', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue({ mock: false, shutters: [shutter(), shutter({ id: '2', name: 'Autre' })] })
    render(<ShutterPreview apiKey="k" shutterId="1" />)
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
    await act(flush)
    expect(screen.getByText('Volet cuisine')).toBeInTheDocument()
    expect(screen.queryByText('Autre')).toBeNull()
    expect(screen.getByRole('button', { name: '▲ Monter' })).toBeInTheDocument()
  })

  it('la bordure du bloc : bleu pâle ouvert, violette baissé', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue({ mock: false, shutters: [shutter({ lastCommand: 'down' })] })
    const { container, unmount } = render(<ShutterPreview apiKey="k" shutterId="1" />)
    await act(flush)
    expect(container.firstElementChild).toHaveClass(CLOSED_BORDER_CLASS)
    unmount()
    vi.mocked(api.fetchShutters).mockResolvedValue({ mock: false, shutters: [shutter({ lastCommand: 'up' })] })
    const open = render(<ShutterPreview apiKey="k" shutterId="1" />)
    await act(flush)
    expect(open.container.firstElementChild).toHaveClass(OPEN_BORDER_CLASS)
  })

  it('un volet absent de la liste, ou une lecture qui échoue, le dit', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValueOnce({ mock: false, shutters: [shutter({ id: '9' })] })
    const { unmount } = render(<ShutterPreview apiKey="k" shutterId="1" />)
    await act(flush)
    expect(screen.getByText(UNKNOWN_TEXT)).toBeInTheDocument()
    unmount()
    vi.mocked(api.fetchShutters).mockRejectedValueOnce(new Error('x'))
    render(<ShutterPreview apiKey="k" shutterId="1" />)
    await act(flush)
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
  })

  it('un ordre part, la réponse remplace le volet ; un échec le dit', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue({ mock: false, shutters: [shutter()] })
    vi.mocked(api.sendShutter)
      .mockResolvedValueOnce(shutter({ lastCommand: 'up', lastAt: 1_700_000_000 }))
      .mockRejectedValueOnce(new Error('x'))
    render(<ShutterPreview apiKey="k" shutterId="1" />)
    await act(flush)
    fireEvent.click(screen.getByRole('button', { name: '▲ Monter' }))
    await act(flush)
    expect(api.sendShutter).toHaveBeenCalledWith('k', '1', 'up')
    expect(screen.getByText(/Dernier ordre : Monter/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '■ Stop' }))
    await act(flush)
    expect(screen.getByText(/L’ordre n’est pas parti/)).toBeInTheDocument()
  })

  it('« Fermer à moitié » : relu plus vite pendant qu’il tourne', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValueOnce({ mock: false, shutters: [shutter({ closeSeconds: 10 })] })
    vi.mocked(api.fetchShutters).mockResolvedValue({ mock: false, shutters: [shutter({ closeSeconds: 10, halfRunning: true })] })
    vi.mocked(api.closeShutterHalf).mockResolvedValue(shutter({ closeSeconds: 10, halfRunning: true }))
    render(<ShutterPreview apiKey="k" shutterId="1" />)
    await act(flush)
    fireEvent.click(screen.getByRole('button', { name: /Fermer à moitié/ }))
    await act(flush)
    expect(api.closeShutterHalf).toHaveBeenCalledWith('k', '1')
    vi.mocked(api.fetchShutters).mockClear()
    await act(async () => {
      vi.advanceTimersByTime(POLL_RUNNING_MS)
      await flush()
    })
    expect(api.fetchShutters).toHaveBeenCalled()
    expect(POLL_MS).toBeGreaterThan(POLL_RUNNING_MS)
  })

  it('les cases de l’action automatique changent tout de suite et reviennent en arrière si l’API refuse', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue({ mock: false, shutters: [shutter()] })
    vi.mocked(api.setShutterAuto).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('x'))
    render(<ShutterPreview apiKey="k" shutterId="1" />)
    await act(flush)
    const open = screen.getByRole('checkbox', { name: 'Ouvrir au lever du soleil' })
    fireEvent.click(open)
    await act(flush)
    expect(api.setShutterAuto).toHaveBeenCalledWith('k', '1', { open: true })
    expect(open).toBeChecked()
    const close = screen.getByRole('checkbox', { name: 'Fermer au coucher du soleil' })
    fireEvent.click(close)
    await act(flush)
    expect(close).toBeChecked()
    expect(screen.getByText(/Le réglage n’a pas été enregistré/)).toBeInTheDocument()
  })

  it('ignore une réponse arrivée après le démontage', async () => {
    let ok: (value: { mock: boolean; shutters: ShutterInfo[] }) => void = () => undefined
    vi.mocked(api.fetchShutters).mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
    render(<ShutterPreview apiKey="k" shutterId="1" />).unmount()
    await act(async () => {
      ok({ mock: false, shutters: [shutter()] })
      await flush()
    })
    expect(api.fetchShutters).toHaveBeenCalledTimes(1)
  })

  it('les cases de l’action automatique ne touchent pas aux autres volets', async () => {
    vi.mocked(api.fetchShutters).mockResolvedValue({ mock: false, shutters: [shutter({ id: '2', name: 'Autre' }), shutter()] })
    vi.mocked(api.setShutterAuto).mockResolvedValue(undefined)
    vi.mocked(api.sendShutter).mockResolvedValue(shutter({ lastCommand: 'up', lastAt: 1_700_000_000 }))
    render(<ShutterPreview apiKey="k" shutterId="1" />)
    await act(flush)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ouvrir au lever du soleil' }))
    await act(flush)
    expect(screen.getByRole('checkbox', { name: 'Ouvrir au lever du soleil' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '▲ Monter' }))
    await act(flush)
    expect(screen.getByText(/Dernier ordre : Monter/)).toBeInTheDocument()
    expect(screen.queryByText('Autre')).toBeNull()
  })
})
