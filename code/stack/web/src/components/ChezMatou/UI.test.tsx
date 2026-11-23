import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import type { AcUnitCard } from '@/components/AcPanel'
import type { ShutterCard } from '@/components/ShuttersPanel'
import type { CameraTileProps, LightsPanelProps } from '@house/ui'
import CameraView from './CameraView'
import ChezMatouUI from './UI'
import { CAMERAS_TITLE, CAMERAS_TV_CLASS, EMPTY_TEXT, ERROR_TEXT, LOADING_TEXT, PROBLEM_TEXT } from './constants'
import type { ChezMatouUIProps, LanState } from './types'

vi.mock('./CameraView', () => ({
  default: (p: ComponentProps<typeof CameraView>) => (
    <div data-testid="view">
      {p.camera.id} {p.lightUrl} {p.hdUrl}
      <button onClick={p.onClose}>fermer</button>
    </div>
  ),
}))
vi.mock('@/components/ShuttersPanel', () => ({
  ShutterCard: (p: ComponentProps<typeof ShutterCard>) => (
    <div>
      <button onClick={() => p.onSend('up')}>volet {p.shutter.id} {String(p.busy)}</button>
      <button onClick={p.onHalf}>half</button>
      <button onClick={() => p.onAuto('open', true)}>auto</button>
    </div>
  ),
}))
vi.mock('@/components/AcPanel', () => ({
  AcUnitCard: (p: ComponentProps<typeof AcUnitCard>) => <button onClick={() => p.onChange({ on: true })}>clim {p.unit.id}</button>,
}))
vi.mock('@house/ui', async (original) => ({
  ...(await original<object>()),
  CameraTile: (p: CameraTileProps) => (
    <div>
      <button onClick={p.onOpen}>tuile {p.name}</button>
      {p.media}
    </div>
  ),
  LightsPanel: (p: LightsPanelProps) => (
    <div>
      <button onClick={() => p.onRoom('z', { on: true })}>zone on</button>
      <button onClick={() => p.onRoom('z', {})}>zone rien</button>
      <button onClick={() => p.onLight('5', { on: false })}>lampe off</button>
      <button onClick={() => p.onLight('5', {})}>lampe rien</button>
      <button onClick={() => p.onAll(true)}>tout</button>
      <button onClick={() => p.onDraft('5', 1)}>brouillon</button>
    </div>
  ),
}))

const state = (over: Partial<LanState> = {}): LanState => ({
  access: { cameras: true, shutters: true, lights: true, ac: true },
  cameras: [
    { id: 'c1', name: 'Intérieur', orientation: 'landscape' },
    { id: 'c2', name: 'Extérieur', orientation: 'portrait' },
  ],
  shutters: [{ id: 's1', name: 'Cuisine', lastCommand: null }],
  lights: [],
  ac: [],
  ...over,
})

const props = (over: Partial<ChezMatouUIProps> = {}): ChezMatouUIProps => ({
  tv: false,
  state: state(),
  problem: null,
  rooms: [],
  shutters: [{ id: 's1', name: 'Cuisine', lastCommand: null, lastAt: null, auto: null, closeSeconds: null, halfRunning: false }],
  acUnits: [{ id: 'salon', name: 'Salon', reachable: true, power: true, mode: 'heat', targetTemp: 21, roomTemp: 19, fan: 'auto', vane: null, wideVane: null }],
  streamUrl: (camera, hd) => (camera === 'rien' ? null : `/s/${camera}${hd ? '?hd' : ''}`),
  onStreamError: vi.fn(),
  opened: null,
  onOpenCamera: vi.fn(),
  onCloseCamera: vi.fn(),
  busy: null,
  error: null,
  onShutter: vi.fn(),
  onRoom: vi.fn(),
  onLight: vi.fn(),
  onAc: vi.fn(),
  ...over,
})

describe('ChezMatouUI', () => {
  it('chargement, problème, rien d’ouvert et erreur d’ordre', () => {
    const { rerender } = render(<ChezMatouUI {...props({ state: null })} />)
    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument()
    rerender(<ChezMatouUI {...props({ state: null, problem: 'outside' })} />)
    expect(screen.getByText(PROBLEM_TEXT.outside)).toBeInTheDocument()
    expect(screen.queryByText(LOADING_TEXT)).toBeNull()
    rerender(<ChezMatouUI {...props({ state: state({ cameras: null, shutters: null, lights: null, ac: null }), error: 'failed' })} />)
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument()
    expect(screen.getByText(ERROR_TEXT)).toBeInTheDocument()
  })

  it('les caméras s’ouvrent au toucher ; la caméra ouverte se ferme', () => {
    const p = props({ opened: 'c1' })
    render(<ChezMatouUI {...p} />)
    fireEvent.click(screen.getByText('tuile Extérieur'))
    expect(p.onOpenCamera).toHaveBeenCalledWith('c2')
    expect(screen.getByTestId('view').textContent).toContain('c1 /s/c1 /s/c1?hd')
    fireEvent.click(screen.getByText('fermer'))
    expect(p.onCloseCamera).toHaveBeenCalled()
  })

  it('en mode télé : pas de titre de section, la grille et la tuile de côté de la télé', () => {
    const { container } = render(<ChezMatouUI {...props({ tv: true })} />)
    expect(screen.queryByText(CAMERAS_TITLE)).toBeNull()
    expect(container.querySelector('.' + CAMERAS_TV_CLASS.split(' ')[0])).not.toBeNull()
    expect(container.querySelector('[class~="col-start-1"]')).not.toBeNull()
  })

  it('une caméra sans adresse (jeton manquant) : image vide, aucune vue ouverte', () => {
    render(<ChezMatouUI {...props({ streamUrl: () => null, opened: 'inconnue' })} />)
    expect(screen.queryByTestId('view')).toBeNull()
  })

  it('les ordres des volets, lampes et clim remontent', () => {
    const p = props({ busy: 'shutter:s1' })
    render(<ChezMatouUI {...p} />)
    fireEvent.click(screen.getByText('volet s1 true'))
    expect(p.onShutter).toHaveBeenCalledWith('s1', 'up')
    fireEvent.click(screen.getByText('half'))
    fireEvent.click(screen.getByText('auto'))
    fireEvent.click(screen.getByText('zone on'))
    expect(p.onRoom).toHaveBeenCalledWith('z', true)
    fireEvent.click(screen.getByText('zone rien'))
    fireEvent.click(screen.getByText('lampe off'))
    expect(p.onLight).toHaveBeenCalledWith('5', false)
    fireEvent.click(screen.getByText('lampe rien'))
    fireEvent.click(screen.getByText('tout'))
    fireEvent.click(screen.getByText('brouillon'))
    expect(p.onRoom).toHaveBeenCalledTimes(1)
    expect(p.onLight).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('clim salon'))
    expect(p.onAc).toHaveBeenCalledWith('salon', { on: true })
  })

  it('une partie coupée n’est pas montrée', () => {
    render(<ChezMatouUI {...props({ state: state({ cameras: null, shutters: null, lights: null, ac: null, access: { cameras: false, shutters: false, lights: false, ac: false } }) })} />)
    expect(screen.queryByText('half')).toBeNull()
    expect(screen.queryByText('zone on')).toBeNull()
  })
})
