import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ApiExplorer from './ApiExplorer'

vi.mock('@/lib/api', () => ({ callService: vi.fn() }))
const api = await import('@/lib/api')

const call = async (path: string) => {
  fireEvent.click(screen.getByText('GET ' + path))
}

describe('ApiExplorer', () => {
  it('appelle le service choisi et montre la réponse JSON mise en forme', async () => {
    vi.mocked(api.callService).mockResolvedValue({ status: 200, body: '{"ok":true}' })
    render(<ApiExplorer apiKey="k" />)
    await call('/welcome')
    await waitFor(() => expect(screen.getByText(/"ok": true/)).toBeInTheDocument())
    expect(api.callService).toHaveBeenCalledWith('k', '/welcome')
  })
  it('un corps qui n’est pas du JSON est montré tel quel', async () => {
    vi.mocked(api.callService).mockResolvedValue({ status: 502, body: 'bad gateway' })
    render(<ApiExplorer apiKey="k" />)
    await call('/welcome')
    await waitFor(() => expect(screen.getByText('bad gateway')).toBeInTheDocument())
  })
  it('un échec réseau donne le statut 0 et le message', async () => {
    vi.mocked(api.callService).mockRejectedValue(new Error('réseau coupé'))
    render(<ApiExplorer apiKey="k" />)
    await call('/welcome')
    await waitFor(() => expect(screen.getByText(/réseau coupé/)).toBeInTheDocument())
  })
  it('une erreur qui n’en est pas une est écrite', async () => {
    vi.mocked(api.callService).mockRejectedValue('oups')
    render(<ApiExplorer apiKey="k" />)
    await call('/welcome')
    await waitFor(() => expect(screen.getByText(/oups/)).toBeInTheDocument())
  })
})
