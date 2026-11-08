import { act, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import SnapshotImage from './SnapshotImage'

vi.mock('@/lib/api', () => ({ fetchSnapshot: vi.fn() }))
const api = await import('@/lib/api')

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:img')
  URL.revokeObjectURL = vi.fn()
})

describe('SnapshotImage', () => {
  it('charge, montre l’image et son identifiant, libère l’adresse au démontage', async () => {
    vi.mocked(api.fetchSnapshot).mockResolvedValue({ blob: new Blob(['x']), takenAt: 1234 })
    const { unmount } = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
    await act(flush)
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:img')
    expect(screen.getByText(/1234/)).toBeInTheDocument()
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:img')
  })
  it('sans identifiant d’image : pas d’étiquette', async () => {
    vi.mocked(api.fetchSnapshot).mockResolvedValue({ blob: new Blob(['x']), takenAt: null })
    render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    await act(flush)
    expect(document.querySelector('img')).not.toBeNull()
    expect(document.body.textContent).not.toMatch(/null/)
  })
  it('une image absente donne le message', async () => {
    vi.mocked(api.fetchSnapshot).mockRejectedValue(new Error('404'))
    const { unmount } = render(<SnapshotImage apiKey="k" camera="c" at={10} upright />)
    await act(flush)
    expect(document.querySelector('img')).toBeNull()
    expect(document.body.textContent).not.toMatch(/Chargement/)
    unmount()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
  it('un nouvel instant remet le chargement', async () => {
    vi.mocked(api.fetchSnapshot).mockResolvedValue({ blob: new Blob(['x']), takenAt: 1 })
    const { rerender } = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    await act(flush)
    vi.mocked(api.fetchSnapshot).mockReturnValue(new Promise(() => undefined))
    rerender(<SnapshotImage apiKey="k" camera="c" at={20} />)
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })
  it('ignore une réponse arrivée après un changement', async () => {
    let ok: (v: { blob: Blob; takenAt: number | null }) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchSnapshot)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const first = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    first.unmount()
    const second = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    second.unmount()
    await act(async () => {
      ok({ blob: new Blob(['x']), takenAt: 1 })
      ko(new Error('x'))
      await flush()
    })
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
