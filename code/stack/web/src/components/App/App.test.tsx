import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { Camera, EventRow } from '@/types'
import * as api from '@/lib/api'
import App from './App'

/* eslint-disable @typescript-eslint/no-explicit-any -- états simulés des hooks */
const h = vi.hoisted(() => ({
  house: {} as any,
  mobile: false,
  notify: { state: 'off', toggle: () => undefined } as any,
  read: { isRead: () => false, markRead: () => undefined } as any,
  card: null as any,
  mosaic: null as any,
  mounts: 0,
}))

vi.mock('@/lib/useHouse', () => ({ useHouse: () => h.house }))
vi.mock('@/lib/api', () => ({ fetchSavedEvents: vi.fn() }))
vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/lib/useReadClips', () => ({ useReadClips: () => h.read }))
vi.mock('@/lib/useMotionNotifications', () => ({ useMotionNotifications: () => h.notify }))
vi.mock('@/components/Lights', () => ({
  default: () => <div data-testid="lights" />,
}))
vi.mock('@/components/Weather', () => ({ default: () => <div data-testid="weather" /> }))
vi.mock('@/components/Home', () => ({
  default: (p: any) => (
    <div data-testid="home">
      <button onClick={() => p.onOpenCamera('voliere-interieur', 'e1')}>home camera</button>
      <button onClick={p.onOpenAc}>home ac</button>
      <button onClick={p.onOpenShutter}>home volets</button>
      <button onClick={p.onOpenPlug}>home prise</button>
    </div>
  ),
}))
vi.mock('@/components/SavedClips', () => ({ default: () => <div data-testid="saved-clips" /> }))
vi.mock('@/components/ShuttersPanel', () => ({ default: () => <div data-testid="shutters" /> }))
vi.mock('@/components/AcPanel', () => ({ default: () => <div data-testid="ac" /> }))
vi.mock('@/components/PlugPanel', () => ({ default: () => <div data-testid="plug" /> }))
vi.mock('@/components/ApiExplorer', () => ({ default: () => <div data-testid="api" /> }))
vi.mock('@/components/CameraCard', () => {
  const CardMock = (p: any) => {
    h.card = p
    // Un compteur de montages : une caméra différente doit recréer l'écran (la `key` de App).
    useState(() => ++h.mounts)
    return (
      <div data-testid="card">
        {p.camera.name}
        {p.onBack ? <button onClick={p.onBack}>retour carte</button> : null}
      </div>
    )
  }
  return { default: CardMock }
})
vi.mock('@/components/CameraMosaic', () => ({
  default: (p: any) => {
    h.mosaic = p
    return (
      <div data-testid="mosaic">
        <button onClick={() => p.onOpen('voliere-interieur')}>ouvrir</button>
        <button onClick={() => p.onOpen('voliere-interieur', 'e1')}>ouvrir clip</button>
        <button onClick={() => p.onOpen('fantome')}>ouvrir fantôme</button>
      </div>
    )
  },
}))

const cam = (name: string): Camera => ({ name, orientation: 'landscape' })
const ready = (over: Record<string, unknown> = {}) => ({
  status: 'ready',
  message: '',
  key: 'k',
  cameras: [cam('voliere-interieur'), cam('voliere-exterieur')],
  events: [
    { id: 'e1', camera: 'voliere-interieur' },
    { id: 'e2', camera: 'voliere-exterieur' },
  ] as EventRow[],
  connect: vi.fn(),
  forget: vi.fn(),
  ...over,
})

beforeEach(() => {
  h.house = ready()
  h.mobile = false
  h.mounts = 0
  h.notify = { state: 'off', toggle: vi.fn() }
  h.read = { isRead: () => false, markRead: vi.fn() }
})

const tab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }))

describe('App : clé', () => {
  it('verrouillée : le formulaire de la clé et le message', () => {
    h.house = ready({ status: 'locked', message: '' })
    const { container } = render(<App />)
    expect(screen.getByText('Entrez votre clé.')).toBeInTheDocument()
    expect(container.querySelector('input[type=password]')).not.toBeNull()
    expect(screen.queryByRole('tablist')).toBeNull()
  })
  it('vérification en cours', () => {
    h.house = ready({ status: 'checking' })
    const { container } = render(<App />)
    expect(screen.getByText('Vérification de la clé…')).toBeInTheDocument()
    expect(container.querySelector('input')).toBeDisabled()
  })
  it('un message d’erreur remplace l’état', () => {
    h.house = ready({ status: 'locked', message: 'clé refusée' })
    render(<App />)
    expect(screen.getAllByText('clé refusée').length).toBeGreaterThan(0)
    expect(screen.queryByText('Entrez votre clé.')).toBeNull()
  })
  it('envoie la clé saisie', () => {
    h.house = ready({ status: 'locked' })
    const { container } = render(<App />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(h.house.connect).toHaveBeenCalledWith('abc')
  })
})

describe('App : en-tête', () => {
  it('la météo est dans la barre du haut, une fois la clé acceptée', () => {
    render(<App />)
    expect(screen.getByTestId('weather')).toBeInTheDocument()
  })
})

describe('App : barre', () => {
  it('le titre ramène à Home', () => {
    render(<App />)
    tab('Lumière')
    fireEvent.click(screen.getByRole('button', { name: 'House' }))
    expect(screen.getByTestId('home')).toBeInTheDocument()
  })
  it('le bouton des notifications : absent si non géré, actif, bloqué', () => {
    h.notify = { state: 'unsupported', toggle: vi.fn() }
    const { unmount } = render(<App />)
    expect(screen.queryByRole('button', { name: /otifications/ })).toBeNull()
    unmount()
    h.notify = { state: 'on', toggle: vi.fn() }
    const on = render(<App />)
    expect(screen.getByRole('button', { name: /Notifications de mouvement activées/ })).toBeEnabled()
    on.unmount()
    h.notify = { state: 'denied', toggle: vi.fn() }
    render(<App />)
    expect(screen.getByRole('button', { name: /bloquées/ })).toBeDisabled()
  })
})

describe('App : onglets', () => {
  it('s’ouvre sur Home, puis l’onglet Caméras montre la mosaïque', () => {
    render(<App />)
    expect(screen.getByTestId('home')).toBeInTheDocument()
    expect(screen.queryByTestId('mosaic')).toBeNull()
    tab('Caméras')
    expect(screen.getByTestId('mosaic')).toBeInTheDocument()
  })
  it('sans caméra : un message', () => {
    h.house = ready({ cameras: [] })
    render(<App />)
    tab('Caméras')
    expect(screen.getByText(/Aucune caméra/)).toBeInTheDocument()
  })
  it.each([
    ['Home', 'home'],
    ['Lumière', 'lights'],
    ['Volet', 'shutters'],
    ['Prise', 'plug'],
    ['API', 'api'],
  ])('l’onglet %s', (name, id) => {
    render(<App />)
    tab(name)
    expect(screen.getByTestId(id)).toBeInTheDocument()
    expect(screen.queryByTestId('mosaic')).toBeNull()
  })

  it('l’onglet API existe sur grand écran, pas sur téléphone (où on retombe sur Home)', () => {
    const { unmount } = render(<App />)
    expect(screen.getByRole('tab', { name: 'API' })).toBeInTheDocument()
    tab('API')
    expect(screen.getByTestId('api')).toBeInTheDocument()
    unmount()
    h.mobile = true
    render(<App />)
    expect(screen.queryByRole('tab', { name: 'API' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Home' })).toBeInTheDocument()
  })

  it('la Home reste montée (cachée) quand on change d’onglet : le clip choisi et les flux restent chargés', () => {
    render(<App />)
    const home = screen.getByTestId('home')
    expect((home.parentElement as HTMLElement).hidden).toBe(false)
    tab('Lumière')
    // le même élément, seulement caché
    expect(screen.getByTestId('home')).toBe(home)
    expect((home.parentElement as HTMLElement).hidden).toBe(true)
    tab('Home')
    expect(screen.getByTestId('home')).toBe(home)
    expect((home.parentElement as HTMLElement).hidden).toBe(false)
  })

  it('la Home ouvre une caméra, la clim, les volets ou la prise', () => {
    render(<App />)
    fireEvent.click(screen.getByText('home camera'))
    expect(screen.getByTestId('card')).toHaveTextContent('voliere-interieur')
    expect(h.card.initialEventId).toBe('e1')
    tab('Home')
    fireEvent.click(screen.getByText('home volets'))
    expect(screen.getByTestId('shutters')).toBeInTheDocument()
    tab('Home')
    fireEvent.click(screen.getByText('home prise'))
    expect(screen.getByTestId('plug')).toBeInTheDocument()
    tab('Home')
    fireEvent.click(screen.getByText('home ac'))
    expect(screen.getByTestId('ac')).toBeInTheDocument()
  })

  it('ouvrir une caméra : retour à la mosaïque, clip choisi', () => {
    render(<App />)
    tab('Caméras')
    fireEvent.click(screen.getByText('ouvrir clip'))
    expect(screen.getByTestId('card')).toHaveTextContent('voliere-interieur')
    expect(h.card.initialEventId).toBe('e1')
    expect(h.card.events.map((e: EventRow) => e.id)).toEqual(['e1'])
    expect(h.card.onRead).toBe(h.read.markRead)
    fireEvent.click(screen.getByRole('button', { name: '← Toutes les caméras' }))
    expect(screen.getByTestId('mosaic')).toBeInTheDocument()
  })
  it('un clip sauvegardé trop ancien pour les événements récents : lu avec les clips sauvegardés avant d’ouvrir la page', async () => {
    const old = { id: 'vieux', camera: 'voliere-interieur', clip: '/clips/vieux' } as EventRow
    vi.mocked(api.fetchSavedEvents).mockResolvedValue([old])
    render(<App />)
    tab('Caméras')
    act(() => h.mosaic.onOpen('voliere-interieur', 'vieux'))
    await act(async () => undefined)
    expect(api.fetchSavedEvents).toHaveBeenCalledWith('k')
    expect(screen.getByTestId('card')).toHaveTextContent('voliere-interieur')
    expect(h.card.initialEventId).toBe('vieux')
    // le clip ancien s'ajoute aux événements récents de la caméra
    expect(h.card.events.map((e: EventRow) => e.id).sort()).toEqual(['e1', 'vieux'])
  })
  it('un clip introuvable ou une lecture refusée : la page s’ouvre quand même', async () => {
    vi.mocked(api.fetchSavedEvents).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('x'))
    render(<App />)
    tab('Caméras')
    act(() => h.mosaic.onOpen('voliere-interieur', 'inconnu'))
    await act(async () => undefined)
    expect(screen.getByTestId('card')).toHaveTextContent('voliere-interieur')
    expect(h.card.events.map((e: EventRow) => e.id)).toEqual(['e1'])
    fireEvent.click(screen.getByRole('button', { name: '← Toutes les caméras' }))
    act(() => h.mosaic.onOpen('voliere-interieur', 'inconnu'))
    await act(async () => undefined)
    expect(screen.getByTestId('card')).toHaveTextContent('voliere-interieur')
  })
  it('ouvrir sans clip, puis une caméra qui n’existe plus : la mosaïque', () => {
    render(<App />)
    tab('Caméras')
    fireEvent.click(screen.getByText('ouvrir'))
    expect(h.card.initialEventId).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: '← Toutes les caméras' }))
    fireEvent.click(screen.getByText('ouvrir fantôme'))
    expect(screen.getByTestId('mosaic')).toBeInTheDocument()
  })
})

describe('App : repères de caméras', () => {
  it('le détail reçoit les autres caméras et de quoi en ouvrir une ; une autre caméra recrée l’écran', () => {
    render(<App />)
    tab('Caméras')
    fireEvent.click(screen.getByText('ouvrir'))
    expect(h.card.others).toEqual(['voliere-exterieur'])
    expect(h.mounts).toBe(1)
    act(() => h.card.onOpenCamera('voliere-exterieur'))
    expect(screen.getByTestId('card')).toHaveTextContent('voliere-exterieur')
    expect(h.card.others).toEqual(['voliere-interieur'])
    expect(h.mounts).toBe(2)
  })
})

describe('App : téléphone', () => {
  beforeEach(() => {
    h.mobile = true
  })
  it('la vue d’une caméra est un écran à part, sans barre ; la flèche ramène à la mosaïque', () => {
    render(<App />)
    tab('Caméras')
    fireEvent.click(screen.getByText('ouvrir'))
    expect(screen.queryByRole('tablist')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'retour carte' }))
    expect(screen.getByTestId('mosaic')).toBeInTheDocument()
  })
  it('l’écran de la caméra est recréé quand on en ouvre une autre', () => {
    render(<App />)
    tab('Caméras')
    fireEvent.click(screen.getByText('ouvrir'))
    expect(h.card.others).toEqual(['voliere-exterieur'])
    act(() => h.card.onOpenCamera('voliere-exterieur'))
    expect(h.mounts).toBe(2)
  })
  it('l’onglet Lumière garde la barre et les onglets (la liste, sans carte)', () => {
    render(<App />)
    tab('Lumière')
    expect(screen.getByTestId('lights')).toBeInTheDocument()
    expect(screen.getAllByRole('tablist').length).toBeGreaterThan(0)
  })
  it('verrouillé, la page reste la page normale', () => {
    h.house = ready({ status: 'locked' })
    render(<App />)
    expect(screen.getByText('Entrez votre clé.')).toBeInTheDocument()
  })
})
