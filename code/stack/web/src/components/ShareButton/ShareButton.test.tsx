import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import ShareButton from './ShareButton'

vi.mock('@/lib/shareClip', () => ({ loadClip: vi.fn(), shareFile: vi.fn() }))
const lib = await import('@/lib/shareClip')
const file = new File(['v'], 'n.mp4', { type: 'video/mp4' })

describe('ShareButton', () => {
  beforeEach(() => {
    vi.mocked(lib.loadClip).mockReset().mockResolvedValue(file)
    vi.mocked(lib.shareFile).mockReset()
  })
  it('partage le clip puis redevient disponible', async () => {
    vi.mocked(lib.shareFile).mockResolvedValue('shared')
    render(<ShareButton path="/c" name="n" title="t" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button', { name: /Préparation/ })).toBeDisabled()
    await act(flush)
    expect(lib.loadClip).toHaveBeenCalledWith('/c', 'n')
    expect(lib.shareFile).toHaveBeenCalledWith(file, 't')
    expect(screen.getByRole('button')).toBeEnabled()
    expect(screen.queryByText(/impossible|pas pu|échec/i)).toBeNull()
  })
  it('un échec est signalé', async () => {
    vi.mocked(lib.loadClip).mockRejectedValue(new Error('x'))
    render(<ShareButton path="/c" name="n" title="t" />)
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(screen.getByRole('button')).toBeEnabled()
    expect(document.body.textContent).toMatch(/.{10,}/)
    expect(document.querySelectorAll('span').length).toBeGreaterThan(0)
  })
  it('menu refusé : le fichier est gardé, « Prêt », et le second toucher le partage sans recharger', async () => {
    vi.mocked(lib.shareFile).mockResolvedValueOnce('ready').mockResolvedValueOnce('shared')
    render(<ShareButton path="/c" name="n" title="t" />)
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(screen.getByRole('button', { name: /Prêt/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(lib.loadClip).toHaveBeenCalledTimes(1)
    expect(lib.shareFile).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Partager' })).toBeInTheDocument()
  })
})
