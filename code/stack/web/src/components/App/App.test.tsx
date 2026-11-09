import { fireEvent, render, screen } from '@testing-library/react'
import type { Camera, EventRow } from '@/types'
import App from './App'

/* eslint-disable @typescript-eslint/no-explicit-any -- états simulés des hooks */
const h = vi.hoisted(() => ({
  house: {} as any,
  mobile: false,
  notify: { state: 'off', toggle: () => undefined } as any,
  read: { isRead: () => false, markRead: () => undefined } as any,
  card: null as any,
  mosaic: null as any,
}))

vi.mock('@/lib/useHouse', () => ({ useHouse: () => h.house }))
vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/lib/useReadClips', () => ({ useReadClips: () => h.read }))
vi.mock('@/lib/useMotionNotifications', () => ({ useMotionNotifications: () => h.notify }))
vi.mock('@/components/Lights', () => ({
  default: () => <div data-testid="lights" />,
}))
vi.mock('@/components/Weather', () => ({ default: () => <div data-testid="weather" /> }))
vi.mock('@/components/Home', () => ({ default: () => <div data-testid="home" /> }))
vi.mock('@/components/ShuttersPanel', () => ({ default: () => <div data-testid="shutters" /> }))
vi.mock('@/components/PlugPanel', () => ({ default: () => <div data-testid="plug" /> }))
vi.mock('@/components/ApiExplorer', () => ({ default: () => <div data-testid="api" /> }))
vi.mock('@/components/CameraCard', () => ({
  default: (p: any) => {
    h.card = p
    return (
      <div data-testid="card">
        {p.camera.name}
        {p.onBack ? <button onClick={p.onBack}>retour carte</button> : null}
      </div>
    )
  },
}))
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
    expect(screen.queryByRole('button', { name: 'Oublier la clé' })).toBeNull()
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
  it('« Oublier la clé »', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Oublier la clé' }))
    expect(h.house.forget).toHaveBeenCalled()
  })
})

describe('App : en-tête', () => {
  it('la météo est dans la barre du haut, une fois la clé acceptée', () => {
    render(<App />)
    expect(screen.getByTestId('weather')).toBeInTheDocument()
  })
})

describe('App : onglets', () => {
  it('s’ouvre sur les caméras (la mosaïque)', () => {
    render(<App />)
    expect(screen.getByTestId('mosaic')).toBeInTheDocument()
  })
  it('sans caméra : un message', () => {
    h.house = ready({ cameras: [] })
    render(<App />)
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

  it('ouvrir une caméra : retour à la mosaïque, clip choisi', () => {
    render(<App />)
    fireEvent.click(screen.getByText('ouvrir clip'))
    expect(screen.getByTestId('card')).toHaveTextContent('voliere-interieur')
    expect(h.card.initialEventId).toBe('e1')
    expect(h.card.events.map((e: EventRow) => e.id)).toEqual(['e1'])
    expect(h.card.onRead).toBe(h.read.markRead)
    fireEvent.click(screen.getByRole('button', { name: '← Toutes les caméras' }))
    expect(screen.getByTestId('mosaic')).toBeInTheDocument()
  })
  it('ouvrir sans clip, puis une caméra qui n’existe plus : la mosaïque', () => {
    render(<App />)
    fireEvent.click(screen.getByText('ouvrir'))
    expect(h.card.initialEventId).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: '← Toutes les caméras' }))
    fireEvent.click(screen.getByText('ouvrir fantôme'))
    expect(screen.getByTestId('mosaic')).toBeInTheDocument()
  })
})

describe('App : téléphone', () => {
  beforeEach(() => {
    h.mobile = true
  })
  it('la vue d’une caméra est un écran à part, sans barre ; la flèche ramène à la mosaïque', () => {
    render(<App />)
    fireEvent.click(screen.getByText('ouvrir'))
    expect(screen.queryByRole('tablist')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'retour carte' }))
    expect(screen.getByTestId('mosaic')).toBeInTheDocument()
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
