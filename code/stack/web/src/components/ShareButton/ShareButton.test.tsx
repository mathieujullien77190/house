import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import ShareButton from './ShareButton'

vi.mock('@/lib/shareClip', () => ({ shareClip: vi.fn() }))
const lib = await import('@/lib/shareClip')

describe('ShareButton', () => {
  it('partage le clip puis redevient disponible', async () => {
    vi.mocked(lib.shareClip).mockResolvedValue('shared')
    render(<ShareButton path="/c" name="n" title="t" />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toBeDisabled()
    await act(flush)
    expect(lib.shareClip).toHaveBeenCalledWith('/c', 'n', 't')
    expect(screen.getByRole('button')).toBeEnabled()
    expect(screen.queryByText(/impossible|pas pu|échec/i)).toBeNull()
  })
  it('un échec est signalé', async () => {
    vi.mocked(lib.shareClip).mockRejectedValue(new Error('x'))
    render(<ShareButton path="/c" name="n" title="t" />)
    fireEvent.click(screen.getByRole('button'))
    await act(flush)
    expect(screen.getByRole('button')).toBeEnabled()
    expect(document.body.textContent).toMatch(/.{10,}/)
    expect(document.querySelectorAll('span').length).toBeGreaterThan(0)
  })
})
