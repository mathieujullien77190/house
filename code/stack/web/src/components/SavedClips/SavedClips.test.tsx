import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { EventRow } from '@/types'
import Home from './Home'

vi.mock('@/lib/api', () => ({ fetchSavedEvents: vi.fn(), setClipSaved: vi.fn(), setClipNote: vi.fn() }))
vi.mock('@/components/GuestLink', () => ({ default: () => <i data-testid="guest" /> }))
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
  const view = render(<Home apiKey="k" />)
  await act(flush)
  return view
}

describe('Home', () => {
  it('chargement, puis échec', async () => {
    vi.mocked(api.fetchSavedEvents).mockReturnValue(new Promise(() => undefined))
    const first = render(<Home apiKey="k" />)
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
    first.unmount()
    vi.mocked(api.fetchSavedEvents).mockRejectedValue(new Error('x'))
    render(<Home apiKey="k" />)
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
    render(<Home apiKey="k" />).unmount()
    render(<Home apiKey="k" />).unmount()
    await act(async () => {
      ok([])
      ko(new Error('x'))
      await flush()
    })
  })

  it('la liste : lien invité, vignettes avec durée une fois la vidéo lue', async () => {
    await mount([event('a'), event('b', { orientation: 'portrait' }), event('c', { clip: null, clip_h264: null })])
    expect(screen.getByTestId('guest')).toBeInTheDocument()
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

  it('ouvrir un clip : lecteur, légende, retour (le lien invité disparaît)', async () => {
    await mount([event('a')])
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    expect(screen.getByText('lecteur /clips/a/h264')).toBeInTheDocument()
    expect(screen.queryByTestId('guest')).toBeNull()
    expect(screen.getByTestId('share')).toBeInTheDocument()
    fireEvent.click(screen.getByText('lecteur /clips/a/h264'))
    expect(screen.getByTestId('guest')).toBeInTheDocument()
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

  it('la note d’un clip : posée depuis la liste, la liste montre celle que l’API a gardée', async () => {
    vi.mocked(api.setClipNote).mockResolvedValue('renard')
    await mount([event('a'), event('b', { note: 'chat' })])
    fireEvent.click(screen.getAllByRole('button', { name: 'Note du clip' })[0])
    fireEvent.change(screen.getByRole('textbox', { name: 'Note du clip' }), { target: { value: ' renard ' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Note du clip' }), { key: 'Enter' })
    await act(flush)
    expect(api.setClipNote).toHaveBeenCalledWith('k', 'a', 'renard')
    expect(screen.getByText('renard')).toBeInTheDocument()
    expect(screen.getByText('chat')).toBeInTheDocument()
  })

  it('la note d’un clip ouvert, puis la liste vidée entre-temps', async () => {
    let done: (note: string) => void = () => undefined
    vi.mocked(api.setClipNote).mockReturnValue(new Promise((resolve) => (done = resolve)))
    await mount([event('a')])
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    fireEvent.click(screen.getByRole('button', { name: 'Note du clip' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Note du clip' }), { target: { value: 'x' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Note du clip' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('tab', { name: 'Non sauvegardé' }))
    vi.mocked(api.setClipSaved).mockResolvedValue(undefined)
    await act(flush)
    await act(async () => {
      done('x')
      await flush()
    })
    expect(screen.getByText(/Aucun clip sauvegardé/)).toBeInTheDocument()
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
        onNote={vi.fn()}
        onOpen={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Non sauvegardé' })).toHaveAttribute('aria-selected', 'true')
  })
})
