import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import GuestLink from './GuestLink'

vi.mock('@/lib/api', () => ({ fetchGuest: vi.fn() }))
const api = await import('@/lib/api')

const info = { key: 'abc', port: 8090, url: '' }

describe('GuestLink', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ne montre rien sans page invité (échec de la lecture)', async () => {
    vi.mocked(api.fetchGuest).mockRejectedValue(new Error('503'))
    const { container } = render(<GuestLink apiKey="k" />)
    await act(flush)
    expect(container).toBeEmptyDOMElement()
  })

  it('en mode menu, pose le bloc sans marge du haut', async () => {
    vi.mocked(api.fetchGuest).mockResolvedValue(info)
    const { container } = render(<GuestLink apiKey="k" menu />)
    await act(flush)
    expect(container.firstChild).toHaveClass('px-3')
  })

  it('montre le lien (nouvel onglet) et copie l’adresse', async () => {
    vi.mocked(api.fetchGuest).mockResolvedValue(info)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<GuestLink apiKey="k" />)
    await act(flush)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('href')).toBe(`https://${window.location.hostname}:8090/?k=abc`)
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(writeText).toHaveBeenCalledWith(link.getAttribute('href'))
    expect(screen.getByRole('button').textContent).toMatch(/copié/i)
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByRole('button').textContent).not.toMatch(/copié/i)
  })

  it('un échec de copie le dit', async () => {
    vi.mocked(api.fetchGuest).mockResolvedValue(info)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('non')) }, configurable: true })
    render(<GuestLink apiKey="k" />)
    await act(flush)
    const before = screen.getByRole('button').textContent
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(screen.getByRole('button').textContent).not.toBe(before)
  })

  it('ignore la réponse arrivée après le démontage', async () => {
    let ok: (i: typeof info) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchGuest)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const first = render(<GuestLink apiKey="k" />)
    first.unmount()
    const second = render(<GuestLink apiKey="k" />)
    second.unmount()
    await act(async () => {
      ok(info)
      ko(new Error('x'))
      await flush()
    })
  })
})
