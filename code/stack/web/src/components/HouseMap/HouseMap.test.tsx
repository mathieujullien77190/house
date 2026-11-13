import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Camera, EventRow } from '@/types'
import { chooseOnHome, resetHomeSelection } from '@/lib/homeSelection'
import HouseMap from './HouseMap'
import { PREVIEW_VIEW } from './constants'

const h = vi.hoisted(() => ({
  mobile: false,
  props: {} as Record<string, (...args: never[]) => unknown> & {
    focusView?: unknown
    cameras?: { id: string; missing?: boolean; off?: boolean }[]
  },
  off: [] as string[],
  events: [] as EventRow[],
  moveItem: vi.fn(),
  height: 530,
  lamps: [] as { id: string; x: number; y: number }[],
  plug: null as { alias: string; on: boolean } | null,
}))

vi.mock('@/components/MapPlan', () => ({
  default: (props: typeof h.props) => {
    h.props = props
    return <div data-testid="map" />
  },
}))
vi.mock('@/components/MapPlan/parcel', () => ({ PARCEL_GATES: [] }))
vi.mock('@/components/Lights', () => ({ PLAN_PLUG_POSITION: { x: 1, y: 2 } }))
vi.mock('@/components/LiveTile', () => ({
  default: (props: { camera: Camera; lastEvent?: { id: string }; read: boolean; onOpen: () => void; onOpenClip?: () => void }) => (
    <div data-testid="thumbnail">
      <button onClick={props.onOpen}>{props.camera.name}</button>
      <span data-testid="last">{props.lastEvent ? `${props.lastEvent.id}:${props.read ? 'lu' : 'non lu'}` : 'aucun'}</span>
      {props.onOpenClip ? <button onClick={props.onOpenClip}>clip</button> : null}
    </div>
  ),
}))
vi.mock('@/components/PlugPanel', () => ({
  default: (props: { embedded?: boolean }) => <div data-testid="plug-preview">{props.embedded ? 'chauffage' : 'page'}</div>,
}))
vi.mock('@/components/AcPreview', () => ({
  default: (props: { unitId: string }) => <div data-testid="ac-preview">{props.unitId}</div>,
}))
vi.mock('@/components/ClipPreview', () => ({
  default: (props: { event: { id: string }; onOpen: () => void }) => (
    <button data-testid="clip-preview" onClick={props.onOpen}>
      {props.event.id}
    </button>
  ),
}))
vi.mock('@/lib/useClipEmojis', () => ({
  emojiItemId: (id: string) => `emoji-${id}`,
  useClipEmojis: () => ({
    emojis: [{ id: 'c1', emoji: '🦊', x: 1, y: 2 }],
    clips: { c1: { id: 'c1', camera: 'voliere-toit', emoji: '🦊' } },
  }),
}))
vi.mock('@/components/BoxPreview', () => ({ default: () => <div data-testid="box-preview" /> }))
vi.mock('@/components/ShutterPreview', () => ({
  default: (props: { shutterId: string }) => <div data-testid="shutter-preview">{props.shutterId}</div>,
}))
vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/lib/useOffCameras', () => ({ useOffCameras: () => h.off }))
vi.mock('@/lib/usePlug', () => ({ usePlug: () => h.plug }))
vi.mock('@/lib/useLampPlan', () => ({ useLampPlan: () => ({ lamps: h.lamps, toggle: vi.fn() }) }))
vi.mock('@/lib/useAcPlan', () => ({ useAcPlan: () => [], acItemId: (id: string) => `ac-${id}` }))
vi.mock('@/lib/useShutterPlan', () => ({
  useShutterPlan: () => ({ shutters: [], toggle: vi.fn() }),
  shutterItemId: (id: string) => `shutter-${id}`,
}))
vi.mock('@/lib/useTemperatureLabels', () => ({ useTemperatureLabels: () => [], labelItemId: (id: string) => `label-${id}` }))
vi.mock('@/lib/usePlan', () => ({
  usePlan: () => ({
    trees: [],
    hedges: [],
    offsets: {},
    items: {},
    links: { 'cage-bas-droite': 'voliere-interieur', entree: 'voliere-toit' },
    cage: { x: 0, y: 0, w: 10, h: 10 },
    cameras: [
      { id: 'cage-bas-droite', name: 'c1', x: 0, y: 0, angle: 0, fov: 60, near: 1, far: 10 },
      { id: 'entree', name: 'c2', x: 0, y: 0, angle: 0, fov: 60, near: 1, far: 10 },
      { id: 'camera-5', name: 'c5', x: 0, y: 0, angle: 0, fov: 60, near: 1, far: 10 },
    ],
    link: vi.fn(),
    moveCamera: vi.fn(),
    adjustCamera: vi.fn(),
    moveItem: h.moveItem,
  }),
}))

const cameras = [
  { name: 'voliere-interieur', orientation: 'landscape' },
  { name: 'voliere-toit', orientation: 'portrait' },
] as Camera[]
const decorProps = () => h.props as unknown as { onSelectDecor: (id: string) => void; onOpenDecor: (id: string) => void; selectedDecorId: string }
const select = (id: string) => act(() => (h.props.onSelectCamera as (id: string) => void)(id))

const onOpenPlug = vi.fn()
const mount = ({ onOpenAc = vi.fn(), onOpenShutter = vi.fn(), onOpenBox = vi.fn() }: { onOpenAc?: () => void; onOpenShutter?: () => void; onOpenBox?: () => void } = {}) => {
  const onOpenCamera = vi.fn()
  render(
    <HouseMap
      apiKey="k"
      cameras={cameras}
      events={h.events}
      isRead={(id) => id === 'e-lu'}
      onOpenCamera={onOpenCamera}
      onOpenAc={onOpenAc}
      onOpenShutter={onOpenShutter}
      onOpenPlug={onOpenPlug}
      onOpenBox={onOpenBox}
    />,
  )
  return onOpenCamera
}

Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1000 })
Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => h.height })

beforeEach(() => {
  // La sélection est globale : chaque essai repart de rien.
  resetHomeSelection()
  h.mobile = false
  h.off = []
  h.events = []
  h.lamps = []
  h.plug = null
  h.height = 530
  h.moveItem.mockClear()
  onOpenPlug.mockClear()
})

// Les miniatures déjà aperçues restent montées (leur flux reste ouvert), cachées ; seule celle qu'on voit compte.
const tile = (): HTMLElement | null => screen.queryAllByTestId('thumbnail').find((element) => !element.closest('[hidden]')) ?? null

describe('HouseMap : les caméras', () => {
  it('trois états : liée allumée, liée éteinte, non liée', () => {
    h.off = ['voliere-toit']
    mount()
    const states = Object.fromEntries(
      (h.props.cameras ?? []).map((camera) => [camera.id, camera.missing ? 'missing' : camera.off ? 'off' : 'on']),
    )
    expect(states).toEqual({ 'cage-bas-droite': 'on', entree: 'off', 'camera-5': 'missing' })
  })

  it('grand écran : un clic choisit la caméra, la carte prend la vue imposée et sa miniature s’affiche ; un second clic la laisse ; un clic à côté la ferme', () => {
    mount()
    expect(tile()).toBeNull()
    expect(h.props.focusView).toBeNull()
    select('cage-bas-droite')
    expect(tile()).toHaveTextContent('voliere-interieur')
    expect(h.props.focusView).toEqual(PREVIEW_VIEW)
    // pas de bascule : un second clic (ou deux événements pour un clic) ne la referme pas
    select('cage-bas-droite')
    expect(tile()).toBeInTheDocument()
    // aucun bouton de fermeture
    expect(screen.queryByRole('button', { name: /fermer/i })).toBeNull()
    // un clic dans le vide de la carte la ferme
    select('')
    expect(tile()).toBeNull()
    // un clic en dehors de la carte et de la miniature la ferme aussi ; dans la miniature, non
    select('cage-bas-droite')
    fireEvent.pointerDown(tile() as HTMLElement)
    expect(tile()).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByTestId('map'))
    expect(tile()).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(tile()).toBeNull()
  })

  it('tous les aperçus sont au même endroit : en haut à droite de la carte', () => {
    mount()
    select('cage-bas-droite')
    const box = () => tile()?.parentElement?.parentElement as HTMLElement
    expect(box().className).toContain('top-2.5')
    expect(box().className).toContain('right-2.5')
    expect(box().style.left).toBe('')
    // une caméra en portrait est au même endroit
    select('entree')
    expect(box().className).toContain('right-2.5')
    expect(box().style.left).toBe('')
  })

  it('une caméra en portrait a une miniature réduite pour tenir dans la hauteur de la carte', () => {
    mount()
    const box = () => tile()?.parentElement?.parentElement as HTMLElement
    select('cage-bas-droite')
    expect(box().style.width).toBe('320px')
    select('entree')
    const width = Number.parseInt(box().style.width, 10)
    expect(width).toBeLessThan(320)
    // la hauteur de la miniature (vidéo 9/16 + 70 px autour) tient dans la carte (530 px) avec ses marges
    expect((width * 16) / 9 + 70).toBeLessThanOrEqual(530 - 24)
  })

  it('la miniature est celle de la liste : dernier événement, lu ou non lu, et son clip s’ouvre', () => {
    h.events = [
      { id: 'e-lu', camera: 'voliere-interieur', clip: '/clips/e-lu' },
      { id: 'e2', camera: 'voliere-toit', clip: null },
    ] as EventRow[]
    const onOpenCamera = mount()
    select('cage-bas-droite')
    expect(within(tile() as HTMLElement).getByTestId('last')).toHaveTextContent('e-lu:lu')
    fireEvent.click(screen.getByRole('button', { name: 'clip' }))
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-interieur', 'e-lu')
    select('entree')
    expect(within(tile() as HTMLElement).getByTestId('last')).toHaveTextContent('e2:non lu')
    expect(screen.queryByRole('button', { name: 'clip' })).toBeNull()
  })

  it('un clic sur la miniature et un double clic sur l’icône ouvrent la page de la caméra', () => {
    const onOpenCamera = mount()
    select('entree')
    fireEvent.click(screen.getByRole('button', { name: 'voliere-toit' }))
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-toit')
    onOpenCamera.mockClear()
    act(() => (h.props.onOpenCamera as (id: string) => void)('cage-bas-droite'))
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-interieur')
    act(() => (h.props.onOpenCamera as (id: string) => void)('camera-5'))
    expect(onOpenCamera).toHaveBeenCalledTimes(1)
  })

  it('une caméra du plan sans vraie caméra est seulement choisie : pas de miniature, pas de vue imposée', () => {
    mount()
    select('camera-5')
    expect(tile()).toBeNull()
    expect(h.props.focusView).toBeNull()
  })

  it('téléphone : un clic ouvre directement la page, sans miniature', () => {
    h.mobile = true
    const onOpenCamera = mount()
    select('cage-bas-droite')
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-interieur')
    expect(tile()).toBeNull()
    select('camera-5')
    expect(onOpenCamera).toHaveBeenCalledTimes(1)
  })
})

describe('HouseMap : le chauffage (la prise)', () => {
  const selectPlug = () => act(() => (h.props.onSelectPlug as () => void)())

  it('grand écran : un clic choisit la prise (même vue, aperçu à droite) ; un clic à côté la ferme ; un double clic ouvre la page', () => {
    mount()
    expect(screen.queryByTestId('plug-preview')).toBeNull()
    expect(h.props.selectedPlugId).toBe('')
    selectPlug()
    expect(screen.getByTestId('plug-preview')).toBeInTheDocument()
    expect(h.props.selectedPlugId).toBe('prise')
    expect(h.props.focusView).toEqual(PREVIEW_VIEW)
    fireEvent.pointerDown(screen.getByTestId('plug-preview'))
    expect(screen.getByTestId('plug-preview')).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByTestId('plug-preview')).toBeNull()
    expect(h.props.selectedPlugId).toBe('')
    act(() => (h.props.onOpenPlug as () => void)())
    expect(onOpenPlug).toHaveBeenCalledTimes(1)
  })

  it('l’aperçu du chauffage et celui d’une caméra se remplacent', () => {
    mount()
    selectPlug()
    select('cage-bas-droite')
    expect(screen.queryByTestId('plug-preview')).toBeNull()
    expect(tile()).toBeInTheDocument()
    selectPlug()
    expect(tile()).toBeNull()
    expect(screen.getByTestId('plug-preview')).toBeInTheDocument()
    select('')
    expect(screen.queryByTestId('plug-preview')).toBeNull()
  })

  it('l’aperçu du chauffage est tout le bloc de la page Prise (sans titre)', () => {
    mount()
    selectPlug()
    expect(screen.getByTestId('plug-preview')).toHaveTextContent('chauffage')
  })

  it('téléphone : un clic ouvre directement la page, sans aperçu', () => {
    h.mobile = true
    mount()
    selectPlug()
    expect(onOpenPlug).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('plug-preview')).toBeNull()
  })
})

describe('HouseMap : les flux gardés et la climatisation', () => {
  it('téléphone : aucun flux n’est préchargé et la carte remplit l’espace qui reste', () => {
    h.mobile = true
    mount()
    expect(screen.queryAllByTestId('thumbnail')).toHaveLength(0)
    expect(h.props.fill).toBe(true)
  })

  it('les flux des caméras liées sont ouverts dès l’ouverture (cachés) : un clic les montre tout de suite', () => {
    mount()
    // avant tout clic : les deux caméras liées sont déjà montées, aucune ne se voit
    expect(screen.getAllByTestId('thumbnail')).toHaveLength(2)
    expect(tile()).toBeNull()
    select('cage-bas-droite')
    expect(screen.getAllByTestId('thumbnail')).toHaveLength(2)
    expect(tile()).toHaveTextContent('voliere-interieur')
    select('entree')
    expect(screen.getAllByTestId('thumbnail')).toHaveLength(2)
    expect(tile()).toHaveTextContent('voliere-toit')
    select('')
    expect(screen.getAllByTestId('thumbnail')).toHaveLength(2)
    expect(tile()).toBeNull()
  })

  it('grand écran : un clic sur une clim montre son bloc, un clic à côté le ferme, un double clic ouvre la page', () => {
    const onOpenAc = vi.fn()
    mount({ onOpenAc })
    const selectAc = (id: string) => act(() => (h.props.onSelectAc as (id: string) => void)(id))
    expect(screen.queryByTestId('ac-preview')).toBeNull()
    selectAc('salon')
    expect(screen.getByTestId('ac-preview')).toHaveTextContent('salon')
    expect(h.props.selectedAcId).toBe('salon')
    expect(h.props.focusView).toEqual(PREVIEW_VIEW)
    fireEvent.pointerDown(screen.getByTestId('ac-preview'))
    expect(screen.getByTestId('ac-preview')).toBeInTheDocument()
    // choisir une caméra remplace le bloc
    select('cage-bas-droite')
    expect(screen.queryByTestId('ac-preview')).toBeNull()
    selectAc('salon')
    expect(tile()).toBeNull()
    act(() => (h.props.onOpenAc as () => void)())
    expect(onOpenAc).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByTestId('ac-preview')).toBeNull()
    expect(h.props.selectedAcId).toBe('')
  })

  it('le chauffage remplace le bloc de la clim', () => {
    mount()
    act(() => (h.props.onSelectAc as (id: string) => void)('salon'))
    act(() => (h.props.onSelectPlug as () => void)())
    expect(screen.queryByTestId('ac-preview')).toBeNull()
    expect(screen.getByTestId('plug-preview')).toBeInTheDocument()
  })

  it('téléphone : un clic sur une clim ouvre directement la page', () => {
    h.mobile = true
    const onOpenAc = vi.fn()
    mount({ onOpenAc })
    act(() => (h.props.onSelectAc as (id: string) => void)('salon'))
    expect(onOpenAc).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('ac-preview')).toBeNull()
  })
})

describe('HouseMap : l’emoji d’un clip', () => {
  const selectEmoji = (id: string) => act(() => (h.props.onToggleEmoji as (id: string) => void)(id))

  it('grand écran : un clic montre le clip (même vue), un clic à côté le ferme, un double clic ouvre le clip dans l’onglet Caméras', () => {
    const onOpenCamera = mount()
    expect(h.props.emojis).toEqual([{ id: 'c1', emoji: '🦊', x: 1, y: 2 }])
    expect(screen.queryByTestId('clip-preview')).toBeNull()
    selectEmoji('c1')
    expect(screen.getByTestId('clip-preview')).toHaveTextContent('c1')
    expect(h.props.focusView).toEqual(PREVIEW_VIEW)
    expect(h.props.selectedEmojiId).toBe('c1')
    fireEvent.click(screen.getByTestId('clip-preview'))
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-toit', 'c1')
    onOpenCamera.mockClear()
    act(() => (h.props.onOpenEmoji as (id: string) => void)('c1'))
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-toit', 'c1')
    act(() => (h.props.onOpenEmoji as (id: string) => void)('absent'))
    expect(onOpenCamera).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByTestId('clip-preview')).toBeNull()
    expect(h.props.selectedEmojiId).toBe('')
  })

  it('l’aperçu du clip remplace les autres (caméra, clim, chauffage) et un clip inconnu ne fait rien', () => {
    mount()
    selectEmoji('absent')
    expect(screen.queryByTestId('clip-preview')).toBeNull()
    select('cage-bas-droite')
    selectEmoji('c1')
    expect(tile()).toBeNull()
    act(() => (h.props.onSelectAc as (id: string) => void)('salon'))
    expect(screen.queryByTestId('clip-preview')).toBeNull()
    selectEmoji('c1')
    act(() => (h.props.onSelectPlug as () => void)())
    expect(screen.queryByTestId('clip-preview')).toBeNull()
    selectEmoji('c1')
    select('cage-bas-droite')
    expect(screen.queryByTestId('clip-preview')).toBeNull()
  })

  it('on déplace l’emoji en modification (place gardée dans le plan)', () => {
    mount()
    act(() => (h.props.onMoveEmoji as (id: string, x: number, y: number) => void)('c1', 7, 8))
    expect(h.moveItem).toHaveBeenCalledWith('emoji-c1', 7, 8)
  })

  it('téléphone : un clic ouvre directement le clip', () => {
    h.mobile = true
    const onOpenCamera = mount()
    selectEmoji('c1')
    expect(onOpenCamera).toHaveBeenCalledWith('voliere-toit', 'c1')
    expect(screen.queryByTestId('clip-preview')).toBeNull()
  })
})

describe('HouseMap : le volet roulant', () => {
  const selectShutter = (id: string) => act(() => (h.props.onSelectShutter as (id: string) => void)(id))

  it('grand écran : un clic montre le bloc du volet (même vue), un clic à côté le ferme, un double clic ouvre l’onglet Volet', () => {
    const onOpenShutter = vi.fn()
    mount({ onOpenShutter })
    expect(screen.queryByTestId('shutter-preview')).toBeNull()
    selectShutter('1')
    expect(screen.getByTestId('shutter-preview')).toHaveTextContent('1')
    expect(h.props.selectedShutterId).toBe('1')
    expect(h.props.focusView).toEqual(PREVIEW_VIEW)
    // un clic ne donne plus d'ordre au volet : plus de rappel de bascule
    expect(h.props.onToggleShutter).toBeUndefined()
    act(() => (h.props.onOpenShutter as () => void)())
    expect(onOpenShutter).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByTestId('shutter-preview')).toBeNull()
    expect(h.props.selectedShutterId).toBe('')
  })

  it('le bloc du volet remplace les autres aperçus, et ils le remplacent', () => {
    mount()
    selectShutter('1')
    act(() => (h.props.onSelectAc as (id: string) => void)('salon'))
    expect(screen.queryByTestId('shutter-preview')).toBeNull()
    selectShutter('1')
    select('cage-bas-droite')
    expect(screen.queryByTestId('shutter-preview')).toBeNull()
    selectShutter('1')
    expect(tile()).toBeNull()
    act(() => (h.props.onToggleEmoji as (id: string) => void)('c1'))
    expect(screen.queryByTestId('shutter-preview')).toBeNull()
    selectShutter('1')
    act(() => (h.props.onSelectPlug as () => void)())
    expect(screen.queryByTestId('shutter-preview')).toBeNull()
  })

  it('téléphone : un clic ouvre directement l’onglet Volet', () => {
    h.mobile = true
    const onOpenShutter = vi.fn()
    mount({ onOpenShutter })
    selectShutter('1')
    expect(onOpenShutter).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('shutter-preview')).toBeNull()
  })
})

describe('HouseMap : la ligne entre l’objet choisi et son bloc', () => {
  it('la carte reçoit la place du bloc quand il est ouvert, rien sinon (la ligne est dessinée par la carte, sous les icônes)', () => {
    mount()
    expect(h.props.fill).toBe(false)
    expect(h.props.linkBox).toBeNull()
    select('cage-bas-droite')
    expect(h.props.linkBox).toEqual({ left: expect.any(Number), top: expect.any(Number), height: expect.any(Number) })
    select('')
    expect(h.props.linkBox).toBeNull()
  })

  it('la place du bloc suit son redimensionnement', () => {
    const observed: (() => void)[] = []
    const original = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        observed.push(callback)
      }
      observe() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    try {
      mount()
      select('cage-bas-droite')
      expect(observed.length).toBeGreaterThan(0)
      act(() => observed.at(-1)?.())
      expect(h.props.linkBox).not.toBeNull()
    } finally {
      globalThis.ResizeObserver = original
    }
  })
})

describe('HouseMap : cas limites de mesure', () => {
  it('une caméra en portrait garde sa largeur par défaut tant que la carte n’a pas de hauteur', () => {
    h.height = 0
    mount()
    select('entree')
    const box = tile()?.parentElement?.parentElement as HTMLElement
    expect(Number.parseInt(box.style.width, 10)).toBeGreaterThan(0)
  })

  it('sans ResizeObserver, la place du bloc est mesurée une fois', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    mount()
    select('cage-bas-droite')
    expect(h.props.linkBox).not.toBeNull()
  })
})

describe('HouseMap : la sélection survit à un changement d’onglet', () => {
  it('le clip, la clim ou le chauffage choisis restent choisis quand la Home est démontée puis remontée', () => {
    mount()
    act(() => (h.props.onToggleEmoji as (id: string) => void)('c1'))
    expect(screen.getByTestId('clip-preview')).toBeInTheDocument()
    // on change d'onglet : la Home est démontée ; au retour, le clip est toujours là
    cleanup()
    mount()
    expect(screen.getByTestId('clip-preview')).toHaveTextContent('c1')
    expect(h.props.selectedEmojiId).toBe('c1')
    cleanup()
    mount()
    act(() => (h.props.onSelectAc as (id: string) => void)('salon'))
    cleanup()
    mount()
    expect(screen.getByTestId('ac-preview')).toHaveTextContent('salon')
    // un clic à côté ferme, et la fermeture aussi est gardée
    fireEvent.pointerDown(document.body)
    cleanup()
    mount()
    expect(screen.queryByTestId('ac-preview')).toBeNull()
  })
})

describe('HouseMap : les déplacements', () => {
  const call = (name: string, ...args: unknown[]) => act(() => (h.props[name] as (...a: unknown[]) => void)(...args))

  it('les étiquettes, les volets et les clims se déplacent sous leur clé du plan', () => {
    mount()
    call('onMoveLabel', 'dehors', 1, 2)
    expect(h.moveItem).toHaveBeenCalledWith('label-dehors', 1, 2)
    call('onMoveShutter', '1', 3, 4)
    expect(h.moveItem).toHaveBeenCalledWith('shutter-1', 3, 4)
    call('onMoveAc', 'salon', 5, 6)
    expect(h.moveItem).toHaveBeenCalledWith('ac-salon', 5, 6)
  })

  it('les icônes seules se déplacent sous leur clé du plan', () => {
    mount()
    call('onMoveDecor', 'pac', 7, 8)
    expect(h.moveItem).toHaveBeenCalledWith('decor-pac', 7, 8)
  })

  it('la prise connectée est posée sur sa place de départ puis relayée à la carte', () => {
    h.plug = { alias: 'Chauffage', on: true }
    mount()
    expect(h.props.plugs).toEqual([{ id: 'prise', name: 'Chauffage', x: 1, y: 2, on: true }])
  })

  it('ni les arbres, ni les haies, ni la cage, ni les portes, ni les contours ne se modifient : pas de rappel donné à la carte', () => {
    mount()
    for (const name of ['onMoveTree', 'onResizeTree', 'onSelectTree', 'onMoveHedge', 'onSelectHedge', 'onMoveCage', 'onMoveOffset', 'onMoveTiles', 'onMoveGarage', 'onMoveRooms'])
      expect(h.props[name]).toBeUndefined()
  })
})

describe('HouseMap : la box', () => {
  it('un clic sur la box ouvre l’onglet Box, un autre décor ne fait rien', () => {
    const onOpenBox = vi.fn()
    mount({ onOpenBox })
    act(() => decorProps().onSelectDecor('pac'))
    act(() => decorProps().onOpenDecor('pac'))
    expect(onOpenBox).not.toHaveBeenCalled()
    act(() => decorProps().onSelectDecor('box'))
    expect(onOpenBox).toHaveBeenCalledTimes(1)
    act(() => decorProps().onOpenDecor('box'))
    expect(onOpenBox).toHaveBeenCalledTimes(2)
  })

  it('la box choisie (sélection globale) montre son aperçu et son décor choisi', () => {
    mount()
    expect(decorProps().selectedDecorId).toBe('')
    expect(screen.queryByTestId('box-preview')).toBeNull()
    act(() => chooseOnHome({ box: true }))
    expect(decorProps().selectedDecorId).toBe('box')
    expect(screen.getByTestId('box-preview')).toBeTruthy()
  })
})
