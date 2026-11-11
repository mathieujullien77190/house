import { act, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import SnapshotImage from './SnapshotImage'

vi.mock('@/lib/api', () => ({ fetchSnapshot: vi.fn() }))
const api = await import('@/lib/api')

let counter = 0
beforeEach(() => {
  counter = 0
  URL.createObjectURL = vi.fn(() => `blob:img${++counter}`)
  URL.revokeObjectURL = vi.fn()
})

const reply = (code: string) => ({ blob: new Blob(['x']), takenAt: 1, code })
const loaded = () => vi.mocked(api.fetchSnapshot).mockImplementation(async (_key, _camera, at) => reply(`d${String.fromCharCode(96 + at / 10)}`))

describe('SnapshotImage', () => {
  it('cadre noir sans texte tant que la première image arrive, puis l’image et son code', async () => {
    loaded()
    const { unmount } = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    expect(document.body.textContent).not.toMatch(/Chargement/)
    expect(document.querySelector('img')).toBeNull()
    await act(flush)
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:img1')
    expect(screen.getByText('da')).toBeInTheDocument()
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:img1')
  })

  it('une nouvelle image apparaît en fondu par-dessus la précédente, le code passe de da à db', async () => {
    loaded()
    const { rerender } = render(<SnapshotImage apiKey="k" camera="c" at={10} fade={120} />)
    await act(flush)
    rerender(<SnapshotImage apiKey="k" camera="c" at={20} fade={120} />)
    await act(flush)
    const images = [...document.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    expect(images).toEqual(['blob:img1', 'blob:img2'])
    expect(screen.getByText('da')).toBeInTheDocument()
    expect(screen.getByText('db')).toBeInTheDocument()
    expect(screen.getByText('db').style.animationDuration).toBe('120ms')
  })

  it('la précédente reste affichée pendant que la suivante arrive', async () => {
    loaded()
    const { rerender } = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    await act(flush)
    vi.mocked(api.fetchSnapshot).mockReturnValue(new Promise(() => undefined))
    rerender(<SnapshotImage apiKey="k" camera="c" at={20} />)
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:img1')
  })

  it('libère les adresses au-delà des deux dernières', async () => {
    loaded()
    const { rerender } = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    await act(flush)
    for (const at of [20, 30]) {
      rerender(<SnapshotImage apiKey="k" camera="c" at={at} />)
      await act(flush)
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:img1')
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:img3')
  })

  it('étiquette droite quand l’image est tournée', async () => {
    loaded()
    const { rerender } = render(<SnapshotImage apiKey="k" camera="c" at={10} upright />)
    await act(flush)
    rerender(<SnapshotImage apiKey="k" camera="c" at={20} upright />)
    await act(flush)
    expect(screen.getByText('db').className).toMatch(/-rotate-90/)
  })

  it('une image absente donne le message', async () => {
    vi.mocked(api.fetchSnapshot).mockRejectedValue(new Error('404'))
    const { unmount } = render(<SnapshotImage apiKey="k" camera="c" at={10} upright />)
    await act(flush)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText(/Pas d’image gardée/)).toBeInTheDocument()
    unmount()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('une image absente après une image, puis une image qui revient : elle s’affiche seule', async () => {
    loaded()
    const { rerender } = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    await act(flush)
    vi.mocked(api.fetchSnapshot).mockRejectedValue(new Error('404'))
    rerender(<SnapshotImage apiKey="k" camera="c" at={20} />)
    await act(flush)
    expect(screen.getByText(/Pas d’image gardée/)).toBeInTheDocument()
    loaded()
    rerender(<SnapshotImage apiKey="k" camera="c" at={30} />)
    await act(flush)
    expect(document.querySelectorAll('img')).toHaveLength(1)
    expect(screen.getByText('dc')).toBeInTheDocument()
  })

  it('ignore une réponse arrivée après un changement', async () => {
    let ok: (v: { blob: Blob; takenAt: number | null; code: string }) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchSnapshot)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    const first = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    first.unmount()
    const second = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    second.unmount()
    await act(async () => {
      ok(reply('da'))
      ko(new Error('x'))
      await flush()
    })
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('sans code (en-tête absent) : aucune étiquette, jamais de valeur fausse', async () => {
    vi.mocked(api.fetchSnapshot).mockResolvedValue(reply(''))
    const { rerender } = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    await act(flush)
    expect(document.querySelector('img')).not.toBeNull()
    expect(document.querySelector('span')).toBeNull()
    rerender(<SnapshotImage apiKey="k" camera="c" at={20} />)
    await act(flush)
    expect(document.querySelectorAll('img')).toHaveLength(2)
    expect(document.querySelector('span')).toBeNull()
  })

  it('le code manque seulement sur la précédente : la nouvelle seule est étiquetée', async () => {
    vi.mocked(api.fetchSnapshot).mockResolvedValueOnce(reply('')).mockResolvedValueOnce(reply('dz'))
    const { rerender } = render(<SnapshotImage apiKey="k" camera="c" at={10} />)
    await act(flush)
    rerender(<SnapshotImage apiKey="k" camera="c" at={20} />)
    await act(flush)
    expect(screen.getAllByText('dz')).toHaveLength(1)
  })
})
