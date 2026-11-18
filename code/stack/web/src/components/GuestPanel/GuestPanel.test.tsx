import { act, fireEvent, render, screen } from '@testing-library/react'
import * as api from '@/lib/api'
import { COPIED_LABEL, COPY_LABEL, COPY_RESET_MS, FAILED_LABEL, LOADING_TEXT, NOT_CONFIGURED_TEXT, UNAVAILABLE_TEXT } from './constants'
import GuestPanel from './GuestPanel'
import type { GuestLanLink } from './types'

vi.mock('@/lib/api', () => ({ fetchGuestLan: vi.fn() }))

const link = (over: Partial<GuestLanLink> = {}): GuestLanLink => ({
  configured: true,
  url: 'https://chezmatou.local:3000/chezmatou?k=abc',
  enabled: true,
  cameras: true,
  shutters: false,
  lights: true,
  ac: false,
  ...over,
})

const writeText = (impl: () => Promise<void>) => Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(impl) }, configurable: true })

describe('GuestPanel', () => {
  it('chargement puis adresse, état et aperçu', async () => {
    vi.mocked(api.fetchGuestLan).mockResolvedValue(link())
    const { container } = render(<GuestPanel apiKey="k" />)
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: link().url ?? '' })).toBeInTheDocument()
    expect(screen.queryByText(LOADING_TEXT)).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe(`${window.location.origin}/chezmatou?k=abc`)
  })

  it('non configurée : un message, pas d’adresse ni d’aperçu', async () => {
    vi.mocked(api.fetchGuestLan).mockResolvedValue(link({ configured: false, url: null }))
    const { container } = render(<GuestPanel apiKey="k" />)
    expect(await screen.findByText(NOT_CONFIGURED_TEXT)).toBeInTheDocument()
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.queryByRole('button', { name: COPY_LABEL })).toBeNull()
  })

  it('API muette : un message', async () => {
    vi.mocked(api.fetchGuestLan).mockRejectedValue(new Error('x'))
    render(<GuestPanel apiKey="k" />)
    expect(await screen.findByText(UNAVAILABLE_TEXT)).toBeInTheDocument()
  })

  it('une réponse après le démontage est ignorée', async () => {
    let resolve: (value: GuestLanLink) => void = () => undefined
    let reject: (reason: unknown) => void = () => undefined
    vi.mocked(api.fetchGuestLan)
      .mockReturnValueOnce(new Promise((ok) => (resolve = ok)))
      .mockReturnValueOnce(new Promise((_ok, no) => (reject = no)))
    render(<GuestPanel apiKey="a" />).unmount()
    render(<GuestPanel apiKey="b" />).unmount()
    await act(async () => {
      resolve(link())
      reject(new Error('x'))
    })
  })

  it('Copier : copié puis retour à Copier ; échec signalé', async () => {
    vi.mocked(api.fetchGuestLan).mockResolvedValue(link())
    writeText(() => Promise.resolve())
    render(<GuestPanel apiKey="k" />)
    const button = await screen.findByRole('button', { name: COPY_LABEL })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await act(async () => fireEvent.click(button))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(link().url)
    expect(screen.getByRole('button', { name: COPIED_LABEL })).toBeInTheDocument()
    await act(async () => void vi.advanceTimersByTime(COPY_RESET_MS))
    expect(screen.getByRole('button', { name: COPY_LABEL })).toBeInTheDocument()
    writeText(() => Promise.reject(new Error('non')))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: COPY_LABEL })))
    expect(screen.getByRole('button', { name: FAILED_LABEL })).toBeInTheDocument()
    vi.useRealTimers()
  })
})
