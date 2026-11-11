import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { EventRow } from '@/types'
import SavedClips from './SavedClips'

vi.mock('@/lib/api', () => ({ fetchSavedEvents: vi.fn(), setClipSaved: vi.fn(), setClipEmoji: vi.fn() }))
vi.mock('@/components/ShareButton', () => ({ default: () => <i data-testid="share" /> }))
vi.mock('@/components/FullscreenBox', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@/components/ClipPlayer', () => ({
  default: (p: { path: string; onClose: () => void }) => <button onClick={p.onClose}>lecteur {p.path}</button>,
}))
vi.mock('@/components/PortraitClip', () => ({ default: (p: { path: string }) => <i>portrait {p.path}</i> }))
const api = await import('@/lib/api')

const event = (id: string, over: Partial<EventRow> = {}): EventRow =>
  ({
    id,
    camera: 'voliere-interieur',
    label: 'person',
    started_at: 1000,
    ended_at: 1010,
    clip: `/clips/${id}`,
    clip_h264: `/clips/${id}/h264`,
    clip_audio: null,
    clip_started_at: null,
    saved: true,
    note: '',
    orientation: 'landscape',
    ...over,
  }) as EventRow

const mount = async (list: EventRow[]) => {
  vi.mocked(api.fetchSavedEvents).mockResolvedValue(list)
  const view = render(<SavedClips apiKey="k" />)
  await act(flush)
  return view
}

describe('Home', () => {
  it('chargement, puis échec', async () => {
    vi.mocked(api.fetchSavedEvents).mockReturnValue(new Promise(() => undefined))
    const first = render(<SavedClips apiKey="k" />)
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
    first.unmount()
    vi.mocked(api.fetchSavedEvents).mockRejectedValue(new Error('x'))
    render(<SavedClips apiKey="k" />)
    await act(flush)
    expect(screen.getByText(/n’ont pas pu être lus/)).toBeInTheDocument()
  })

  it('liste vide', async () => {
    await mount([])
    expect(screen.getByText(/Aucun clip sauvegardé/)).toBeInTheDocument()
  })

  it('ignore les réponses après démontage', async () => {
    let ok: (l: EventRow[]) => void = () => undefined
    let ko: (e: Error) => void = () => undefined
    vi.mocked(api.fetchSavedEvents)
      .mockReturnValueOnce(new Promise((resolve) => (ok = resolve)))
      .mockReturnValueOnce(new Promise((_r, reject) => (ko = reject)))
    render(<SavedClips apiKey="k" />).unmount()
    render(<SavedClips apiKey="k" />).unmount()
    await act(async () => {
      ok([])
      ko(new Error('x'))
      await flush()
    })
  })

  it('la liste : vignettes avec durée une fois la vidéo lue', async () => {
    await mount([event('a'), event('b', { orientation: 'portrait' }), event('c', { clip: null, clip_h264: null })])
    const videos = document.querySelectorAll('video')
    expect(videos).toHaveLength(2)
    Object.defineProperty(videos[0], 'duration', { value: 14.4 })
    fireEvent.loadedMetadata(videos[0])
    fireEvent.loadedMetadata(videos[0])
    expect(screen.getAllByText(/14 s/).length).toBeGreaterThan(0)
    Object.defineProperty(videos[1], 'duration', { value: 20 })
    fireEvent.loadedMetadata(videos[1])
    expect(screen.getAllByText(/20 s/).length).toBeGreaterThan(0)
  })

  it('ouvrir un clip : lecteur, légende, retour', async () => {
    await mount([event('a')])
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    expect(screen.getByText('lecteur /clips/a/h264')).toBeInTheDocument()
    expect(screen.getByTestId('share')).toBeInTheDocument()
    fireEvent.click(screen.getByText('lecteur /clips/a/h264'))
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    fireEvent.click(screen.getByRole('button', { name: /Clips sauvegardés/ }))
    expect(screen.queryByText('lecteur /clips/a/h264')).toBeNull()
  })

  it('un clip en portrait s’ouvre dans le lecteur tourné', async () => {
    await mount([event('a', { orientation: 'portrait', clip_audio: '/clips/a/audio' })])
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    expect(screen.getByText('portrait /clips/a/h264')).toBeInTheDocument()
  })

  it('un clip en portrait sans son', async () => {
    await mount([event('a', { orientation: 'portrait' })])
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    expect(screen.getByText('portrait /clips/a/h264')).toBeInTheDocument()
  })

  it('un clip ouvert sans fichier lisible retombe sur la liste', async () => {
    await mount([event('a', { clip: null, clip_h264: null })])
    expect(screen.getByText('Clips sauvegardés')).toBeInTheDocument()
  })

  it('« Non sauvegardé » libère le clip : il quitte la liste', async () => {
    vi.mocked(api.setClipSaved).mockResolvedValue(undefined)
    await mount([event('a'), event('b')])
    fireEvent.click(screen.getAllByLabelText(/voliere-interieur/)[0])
    fireEvent.click(screen.getByRole('tab', { name: 'Sauvegardé' }))
    expect(api.setClipSaved).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Non sauvegardé' }))
    await act(flush)
    expect(api.setClipSaved).toHaveBeenCalledWith('k', 'a', false)
    expect(screen.getAllByLabelText(/voliere-interieur/)).toHaveLength(1)
  })

  it('un échec reste ouvert et le dit ; un nouvel essai efface le message', async () => {
    vi.mocked(api.setClipSaved).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(undefined)
    await mount([event('a')])
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    fireEvent.click(screen.getByRole('tab', { name: 'Non sauvegardé' }))
    await act(flush)
    expect(screen.getByText(/n’a pas pu être libéré/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Non sauvegardé' }))
    await act(flush)
    expect(screen.queryByText(/n’a pas pu être libéré/)).toBeNull()
  })

  it('avec onOpenCamera, un clic sur la vignette ouvre le détail de sa caméra sur ce clip au lieu de le lire sur place', async () => {
    vi.mocked(api.fetchSavedEvents).mockResolvedValue([event('a')])
    const onOpenCamera = vi.fn()
    render(<SavedClips apiKey="k" onOpenCamera={onOpenCamera} />)
    await act(flush)
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-interieur', 'a')
    // le clip n'est pas lu sur place
    expect(screen.queryByText(/lecteur/)).toBeNull()
    expect(screen.getByText('Clips sauvegardés')).toBeInTheDocument()
  })

  it('l’emoji d’un clip : tapé dans le champ, celui de l’API est gardé ; un champ vide le retire', async () => {
    vi.mocked(api.setClipEmoji).mockResolvedValueOnce('🦊').mockResolvedValueOnce('')
    await mount([event('a'), event('b', { emoji: '🐦' })])
    fireEvent.click(screen.getAllByRole('button', { name: 'Emoji du clip' })[0])
    fireEvent.change(screen.getByRole('textbox', { name: 'Emoji du clip' }), { target: { value: '🦊' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Emoji du clip' }), { key: 'Enter' })
    await act(flush)
    expect(api.setClipEmoji).toHaveBeenCalledWith('k', 'a', '🦊')
    expect(screen.getByText('🦊')).toBeInTheDocument()
    expect(screen.getByText('🐦')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Emoji du clip' })[0])
    fireEvent.change(screen.getByRole('textbox', { name: 'Emoji du clip' }), { target: { value: '' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Emoji du clip' }), { key: 'Enter' })
    await act(flush)
    expect(api.setClipEmoji).toHaveBeenLastCalledWith('k', 'a', null)
    expect(screen.queryByText('🦊')).toBeNull()
  })

  it('l’emoji d’un clip ouvert est aussi sur le lecteur', async () => {
    vi.mocked(api.setClipEmoji).mockResolvedValue('🦌')
    await mount([event('a', { emoji: '🐦' })])
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    await act(flush)
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Emoji du clip' }), { target: { value: '🦌' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Emoji du clip' }), { key: 'Enter' })
    await act(flush)
    expect(api.setClipEmoji).toHaveBeenCalledWith('k', 'a', '🦌')
  })

  it('libérer pendant que la liste a été vidée entre-temps', async () => {
    let done: () => void = () => undefined
    vi.mocked(api.setClipSaved).mockReturnValue(new Promise((resolve) => (done = resolve)))
    await mount([event('a')])
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    fireEvent.click(screen.getByRole('tab', { name: 'Non sauvegardé' }))
    await act(async () => {
      done()
      await flush()
    })
    expect(screen.getByText(/Aucun clip sauvegardé/)).toBeInTheDocument()
  })
})

describe('HomeUI : cas que le conteneur ne produit pas', () => {
  it('un clip ouvert non sauvegardé montre « Non sauvegardé » choisi', async () => {
    const { default: HomeUI } = await import('./UI')
    render(
      <HomeUI
        apiKey="k"
        events={[event('a')]}
        failed={false}
        opened={event('a')}
        durations={{}}
        onDuration={vi.fn()}
        saved={false}
        onSave={vi.fn()}
        saveFailed={false}
        onEmoji={vi.fn()}
        onOpen={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Non sauvegardé' })).toHaveAttribute('aria-selected', 'true')
  })
})
