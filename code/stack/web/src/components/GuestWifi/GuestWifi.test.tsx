import { act, fireEvent, render, screen } from '@testing-library/react'
import type { GuestWifi as GuestWifiData } from '@/types'
import GuestWifi from './GuestWifi'
import { COPIED_TEXT, COPY_LABEL, ERROR_TEXT, HIDE_LABEL, LOADING_TEXT, NONE_TEXT, SHOW_LABEL } from './constants'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchGuestWifi: vi.fn(),
}))
const api = await import('@/lib/api')

const wifi = (over: Partial<GuestWifiData> = {}): GuestWifiData => ({ ssid: 'Invites', password: 'secret-123', description: null, maxUses: 5, users: 2, ...over })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const show = async () => {
  fireEvent.click(screen.getByRole('button', { name: SHOW_LABEL }))
  await act(flush)
}

afterEach(() => vi.clearAllMocks())

describe('GuestWifi', () => {
  it('rien n’est lu tant qu’on ne le demande pas ; le mot de passe s’affiche puis se masque', async () => {
    vi.mocked(api.fetchGuestWifi).mockResolvedValue(wifi())
    render(<GuestWifi apiKey="k" />)
    expect(api.fetchGuestWifi).not.toHaveBeenCalled()
    expect(screen.queryByText('secret-123')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: SHOW_LABEL }))
    expect(screen.getByText(LOADING_TEXT)).toBeTruthy()
    expect((screen.getByRole('button', { name: SHOW_LABEL }) as HTMLButtonElement).disabled).toBe(true)
    await act(flush)
    expect(api.fetchGuestWifi).toHaveBeenCalledWith('k')
    expect(screen.getByText('secret-123')).toBeTruthy()
    expect(screen.getByText('Invites')).toBeTruthy()
    expect(screen.getByText('2 / 5')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: HIDE_LABEL }))
    expect(screen.queryByText('secret-123')).toBeNull()
    expect(screen.getByRole('button', { name: SHOW_LABEL })).toBeTruthy()
  })

  it('sans nom ni limite : un tiret, et pas de ligne d’usage', async () => {
    vi.mocked(api.fetchGuestWifi).mockResolvedValue(wifi({ ssid: null, maxUses: null }))
    render(<GuestWifi apiKey="k" />)
    await show()
    expect(screen.getByText('–')).toBeTruthy()
    expect(screen.queryByText('Appareils')).toBeNull()
  })

  it('copie le mot de passe ; le presse-papiers refusé ne dit pas « Copié »', async () => {
    vi.mocked(api.fetchGuestWifi).mockResolvedValue(wifi())
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('refusé'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<GuestWifi apiKey="k" />)
    await show()
    fireEvent.click(screen.getByRole('button', { name: COPY_LABEL }))
    await act(flush)
    expect(writeText).toHaveBeenCalledWith('secret-123')
    expect(screen.getByRole('button', { name: COPIED_TEXT })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPIED_TEXT }))
    await act(flush)
    expect(screen.getByRole('button', { name: COPY_LABEL })).toBeTruthy()
  })

  it('404 : pas de WiFi invité ; autre échec : message d’erreur', async () => {
    vi.mocked(api.fetchGuestWifi).mockRejectedValueOnce(new api.ApiError(404, 'x')).mockRejectedValueOnce(new api.ApiError(502, 'x')).mockRejectedValueOnce(new Error('réseau'))
    render(<GuestWifi apiKey="k" />)
    await show()
    expect(screen.getByText(NONE_TEXT)).toBeTruthy()
    await show()
    expect(screen.getByText(ERROR_TEXT)).toBeTruthy()
    await show()
    expect(screen.getByText(ERROR_TEXT)).toBeTruthy()
  })
})
