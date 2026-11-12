import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { flush } from '@/test/fetch'
import type { Camera, EventRow, HueLight, HueSensor, PlugState } from '@/types'
import CameraCard from './CameraCard'

/* eslint-disable @typescript-eslint/no-explicit-any -- doubles : les props des composants remplacés sont inspectées librement */
const h = vi.hoisted(() => {
  const fresh = () => ({
    mobile: false,
    power: null as any,
    powerFailed: false,
    sensors: [] as any[],
    lamp: null as any,
    plug: null as any,
    recorder: { recording: false, seconds: 0, busy: false, failed: false, stopped: false, toggle: () => undefined } as any,
    zone: { points: [], reduced: false, failed: false, change: () => undefined, commit: () => undefined, reset: () => undefined } as any,
    big: { ref: { current: null }, big: false, open: () => undefined, close: () => undefined } as any,
    now: 1_800_000_000,
    pinchArgs: null as any,
    markers: { markers: [{ target: 'b', x: 0.2, y: 0.3 }], move: () => undefined, commit: () => undefined, remove: () => undefined } as any,
    markersVisible: { visible: true, toggle: () => undefined } as any,
    offCameras: [] as string[],
  })
  return {
    fresh,
    s: fresh(),
    card: null as any,
    markersLayer: null as any,
    clip: null as any,
    timeline: null as any,
    zoneEditor: null as any,
    setPower: undefined as any,
  }
})

vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.s.mobile }))
vi.mock('@/lib/usePower', () => ({ usePower: () => ({ power: h.s.power, setPower: h.setPower, failed: h.s.powerFailed }) }))
vi.mock('@/lib/useSensors', () => ({ useSensors: () => h.s.sensors }))
vi.mock('@/lib/useLamp', () => ({ useLamp: () => h.s.lamp }))
vi.mock('@/lib/usePlug', () => ({ usePlug: () => h.s.plug }))
vi.mock('@/lib/useRecording', () => ({ useRecording: () => h.s.recorder }))
vi.mock('@/lib/useMarkers', () => ({ useMarkers: () => h.s.markers }))
vi.mock('@/lib/useMarkersVisible', () => ({ useMarkersVisible: () => h.s.markersVisible }))
vi.mock('@/lib/useOffCameras', () => ({ useOffCameras: () => h.s.offCameras }))
vi.mock('@/lib/useZone', () => ({ useZone: () => h.s.zone }))
vi.mock('@/lib/useBigView', () => ({ useBigView: () => h.s.big }))
vi.mock('@/lib/useClock', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/useClock')>()),
  useClock: () => h.s.now,
}))
vi.mock('@/lib/usePinchZoom', () => ({
  usePinchZoom: (...args: unknown[]) => {
    h.s.pinchArgs = args
    return { handlers: {}, style: {} }
  },
}))
vi.mock('@/lib/api', () => ({ setClipSaved: vi.fn(), setCameraPower: vi.fn() }))
vi.mock('@/components/ClipPlayer', () => ({
  default: (props: any) => {
    h.clip = props
    return <div data-testid="clip" />
  },
}))
vi.mock('@/components/Timeline', () => ({
  default: (props: any) => {
    h.timeline = props
    return <div data-testid="timeline">{props.controls}</div>
  },
}))
vi.mock('@/components/LiveAudio', () => ({ default: (props: any) => <i data-testid="live-audio">{props.camera}</i> }))
vi.mock('@/components/CameraMarkers', () => ({
  default: (props: any) => {
    h.markersLayer = props
    return <div data-testid="markers-layer" />
  },
}))
vi.mock('@/components/MarkersToggle', () => ({
  default: (props: any) => (
    <button data-testid="markers-toggle" onClick={props.onToggle}>
      {String(props.visible)}
    </button>
  ),
}))
vi.mock('@/components/SnapshotImage', () => ({ default: (props: any) => <div data-testid="snapshot">{props.at}</div> }))
vi.mock('@house/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@house/ui')>()),
  ZoneEditor: (props: any) => {
    h.zoneEditor = props
    return <div data-testid="zone-editor" />
  },
  CameraCard: (props: any) => {
    h.card = props
    const slot = (name: string, node: ReactNode) => (node ? <div data-testid={name}>{node}</div> : null)
    return (
      <section>
        <h2>{props.name}</h2>
        {slot('actions', props.actions)}
        {slot('videoActions', props.videoActions)}
        {slot('topLeft', props.topLeft)}
        {slot('media', props.media)}
        {slot('details', props.details)}
        {slot('clock', props.clock)}
        {slot('layer', props.layer)}
        {slot('sound', props.sound)}
        {slot('overlay', props.overlay)}
        {slot('timeline-slot', props.timeline)}
        <button onClick={props.onBack}>retour</button>
        <button onClick={props.onExpand}>agrandir</button>
        <button onClick={props.onCollapse}>réduire</button>
      </section>
    )
  },
}))

const api = await import('@/lib/api')

const camera = (over: Partial<Camera> = {}): Camera => ({ name: 'voliere-interieur', orientation: 'landscape', ...over })
const event = (id: string, over: Partial<EventRow> = {}): EventRow =>
  ({
    id,
    camera: 'voliere-interieur',
    label: 'person',
    started_at: 1000,
    ended_at: 1020,
    clip: `/clips/${id}`,
    clip_h264: `/clips/${id}/h264`,
    clip_audio: null,
    clip_started_at: 995,
    saved: false,
    orientation: 'landscape',
    ...over,
  }) as EventRow

const sensor = { id: '54', name: 'motion interieur', temperature: 9.5 } as HueSensor
const lamp = { id: '26', name: 'P', on: true, bri: 100, reachable: true } as HueLight
const plug = { on: true } as PlugState

const mount = (props: Partial<Parameters<typeof CameraCard>[0]> = {}) =>
  render(<CameraCard apiKey="k" camera={camera()} events={[]} {...props} />)

const power = (over: Record<string, unknown> = {}) => ({
  camera: 'c',
  port: 1,
  on: true,
  powered: true,
  watts: 5,
  streaming: true,
  ...over,
})

beforeEach(() => {
  h.s = h.fresh()
  h.card = h.clip = h.timeline = h.zoneEditor = h.markersLayer = null
  h.setPower = vi.fn()
})

/** Choisit un événement comme le fait la frise. */
const pick = (e: EventRow, at: number | null = 995) => act(() => h.timeline.onEvent(e, at))

describe('CameraCard : le direct', () => {
  it('montre le nom et l’adresse du flux (4K par défaut)', () => {
    mount()
    expect(screen.getByRole('heading')).toHaveTextContent('voliere-interieur')
    expect(document.querySelector('img')).toHaveAttribute('src', '/stream?camera=voliere-interieur&quality=hd')
  })
  it('en 4K, le flux léger s’affiche d’abord ; le 4K se charge caché et le remplace dès sa première image', () => {
    mount()
    const sources = () => [...document.querySelectorAll('img')].map((img) => img.getAttribute('src'))
    // le 4K est dans la page (caché), le léger est par-dessus
    expect(sources()).toEqual(['/stream?camera=voliere-interieur&quality=hd', '/stream?camera=voliere-interieur'])
    expect(document.querySelector('img')?.closest('.opacity-0')).not.toBeNull()
    // la première image du 4K arrive : le léger disparaît, le 4K devient visible
    const hd = document.querySelector('img') as HTMLImageElement
    Object.defineProperty(hd, 'naturalWidth', { value: 3840 })
    Object.defineProperty(hd, 'naturalHeight', { value: 2160 })
    fireEvent.load(hd)
    expect(sources()).toEqual(['/stream?camera=voliere-interieur&quality=hd'])
    expect(document.querySelector('img')?.closest('.opacity-0')).toBeNull()
    // revenir à « Léger » puis « 4K » repart du flux léger
    fireEvent.click(screen.getByRole('tab', { name: 'L' }))
    expect(sources()).toEqual(['/stream?camera=voliere-interieur'])
    fireEvent.click(screen.getByRole('tab', { name: '4K' }))
    expect(sources()).toEqual(['/stream?camera=voliere-interieur&quality=hd', '/stream?camera=voliere-interieur'])
  })
  it('« L » et « 4K » changent le flux ; le même choix ne fait rien', () => {
    mount()
    fireEvent.click(screen.getByRole('tab', { name: '4K' }))
    expect(document.querySelector('img')).toHaveAttribute('src', '/stream?camera=voliere-interieur&quality=hd')
    fireEvent.click(screen.getByRole('tab', { name: 'L' }))
    expect(document.querySelector('img')).toHaveAttribute('src', '/stream?camera=voliere-interieur')
  })
  it('sur téléphone, le flux ajoute screen=mobile', () => {
    h.s.mobile = true
    mount()
    expect(document.querySelector('img')?.getAttribute('src')).toContain('screen=mobile')
    expect(h.card.screen).toBe(true)
  })
  it('« L / 4K » : « L » partout ; sur téléphone dans les actions, sur grand écran posé sur la vidéo', () => {
    h.s.mobile = true
    const phone = mount()
    expect(screen.getByRole('tab', { name: 'L' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '4K' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Léger' })).toBeNull()
    expect(screen.getByTestId('actions')).toContainElement(screen.getByRole('tab', { name: 'L' }))
    phone.unmount()
    h.s.mobile = false
    mount()
    expect(screen.getByTestId('videoActions')).toContainElement(screen.getByRole('tab', { name: 'L' }))
    expect(screen.getByTestId('actions')).not.toContainElement(screen.getByRole('tab', { name: 'L' }))
  })
  it('caméra éteinte ou en démarrage : image noire avec le message', () => {
    h.s.power = power({ on: false })
    const first = mount()
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('Caméra éteinte')).toBeInTheDocument()
    first.unmount()
    h.s.power = power({ streaming: false })
    mount()
    expect(screen.getByText('Caméra en démarrage…')).toBeInTheDocument()
  })
  it('caméra allumée et qui diffuse : le flux', () => {
    h.s.power = power()
    mount()
    expect(document.querySelector('img')).not.toBeNull()
  })
  it('sans switch (état inconnu) : seulement L et 4K, pas de « Off »', () => {
    h.s.power = null
    mount()
    expect(screen.queryByRole('tab', { name: 'Off' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'L' })).toBeInTheDocument()
  })
  it('« Off » éteint la caméra au niveau du PoE et rend le nouvel état', async () => {
    h.s.power = power()
    const next = power({ on: false })
    vi.mocked(api.setCameraPower).mockResolvedValue(next as never)
    mount()
    fireEvent.click(screen.getByRole('tab', { name: 'Off' }))
    await act(flush)
    expect(api.setCameraPower).toHaveBeenCalledWith('k', 'voliere-interieur', false)
    expect(h.setPower).toHaveBeenCalledWith(next)
  })
  it('« Off » sur une caméra déjà éteinte : rien ; l’onglet Off est celui qui est choisi', () => {
    h.s.power = power({ on: false })
    mount()
    expect(screen.getByRole('tab', { name: 'Off' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Off' }))
    expect(api.setCameraPower).not.toHaveBeenCalled()
  })
  it('« L » ou « 4K » rallume une caméra éteinte, puis choisit la qualité', async () => {
    h.s.power = power({ on: false })
    vi.mocked(api.setCameraPower).mockResolvedValue(power() as never)
    mount()
    fireEvent.click(screen.getByRole('tab', { name: 'L' }))
    await act(flush)
    expect(api.setCameraPower).toHaveBeenCalledWith('k', 'voliere-interieur', true)
  })
  it('un switch qui ne répond pas : le message, et un second clic reste possible', async () => {
    h.s.power = power()
    vi.mocked(api.setCameraPower).mockRejectedValue(new Error('x'))
    mount()
    fireEvent.click(screen.getByRole('tab', { name: 'Off' }))
    await act(flush)
    expect(screen.getByText('Le switch n’a pas répondu.')).toBeInTheDocument()
  })
  it('pendant un ordre en route, un autre clic est ignoré', async () => {
    h.s.power = power()
    let done: (value: never) => void = () => undefined
    vi.mocked(api.setCameraPower).mockReturnValue(new Promise<never>((resolve) => (done = resolve)))
    mount()
    fireEvent.click(screen.getByRole('tab', { name: 'Off' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Off' }))
    expect(api.setCameraPower).toHaveBeenCalledTimes(1)
    await act(async () => done(power({ on: false }) as never))
  })
})

describe('CameraCard : le son du direct', () => {
  it('en direct : le bouton du son de la caméra est posé sur la vidéo', () => {
    mount()
    expect(screen.getByTestId('live-audio')).toHaveTextContent('voliere-interieur')
  })
  it('caméra éteinte, clip ou image passée : pas de son', () => {
    h.s.power = power({ on: false })
    const off = mount()
    expect(screen.queryByTestId('sound')).toBeNull()
    off.unmount()
    h.s.power = null
    mount({ events: [event('a')] })
    expect(screen.getByTestId('sound')).toBeInTheDocument()
    pick(event('a'))
    expect(screen.queryByTestId('sound')).toBeNull()
  })
})

describe('CameraCard : les repères des autres caméras', () => {
  const open = vi.fn()
  it('grand écran, en direct : la couche des repères et le bouton à côté du son', () => {
    mount({ others: ['b'], onOpenCamera: open })
    expect(screen.getByTestId('layer')).toContainElement(screen.getByTestId('markers-layer'))
    expect(h.markersLayer.markers).toBe(h.s.markers.markers)
    expect(h.markersLayer.onMove).toBe(h.s.markers.move)
    expect(h.markersLayer.onCommit).toBe(h.s.markers.commit)
    expect(h.markersLayer.onRemove).toBe(h.s.markers.remove)
    // Le clic ouvre l'autre caméra ; en direct, sans instant (il n'y a pas d'image regardée).
    h.markersLayer.onOpen('b')
    // et la vitesse de défilement des images (×1 au départ : le rang 10 de `RATES`) passe avec.
    expect(open).toHaveBeenCalledWith('b', undefined, 10, false)
    // aucune caméra éteinte : tous les repères agissent
    expect(h.markersLayer.inactive).toEqual([])
    expect(screen.getByTestId('sound')).toContainElement(screen.getByTestId('markers-toggle'))
    expect(screen.getByTestId('sound')).toContainElement(screen.getByTestId('live-audio'))
  })

  it('sur l’image d’un instant passé : les repères se voient et ouvrent l’autre caméra à la même seconde', () => {
    mount({ others: ['b'], onOpenCamera: open })
    act(() => h.timeline.onCursor(900))
    expect(screen.getByTestId('markers-layer')).toBeInTheDocument()
    h.markersLayer.onOpen('b')
    expect(open).toHaveBeenLastCalledWith('b', 900, 10, false)
  })
  it('les caméras éteintes sont données à la couche : leur repère ne fait rien', () => {
    h.s.offCameras = ['b']
    mount({ others: ['b'], onOpenCamera: open })
    expect(h.markersLayer.inactive).toEqual(['b'])
  })
  it('le bouton montre ou cache les repères', () => {
    h.s.markersVisible = { visible: true, toggle: vi.fn() }
    mount({ others: ['b'], onOpenCamera: open })
    fireEvent.click(screen.getByTestId('markers-toggle'))
    expect(h.s.markersVisible.toggle).toHaveBeenCalledTimes(1)
  })
  it('repères cachés : le bouton reste, la couche disparaît', () => {
    h.s.markersVisible = { visible: false, toggle: () => undefined }
    mount({ others: ['b'], onOpenCamera: open })
    expect(screen.getByTestId('markers-toggle')).toHaveTextContent('false')
    expect(screen.queryByTestId('layer')).toBeNull()
  })
  it('sans autre caméra ou sans moyen de l’ouvrir : ni couche ni bouton', () => {
    const none = mount({ onOpenCamera: open })
    expect(screen.queryByTestId('markers-toggle')).toBeNull()
    none.unmount()
    mount({ others: ['b'] })
    expect(screen.queryByTestId('markers-toggle')).toBeNull()
    expect(screen.queryByTestId('layer')).toBeNull()
  })
  it('sur téléphone : les repères et leur bouton aussi', () => {
    h.s.mobile = true
    mount({ others: ['b'], onOpenCamera: open })
    expect(screen.getByTestId('markers-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('layer')).toBeInTheDocument()
  })
  it('caméra éteinte : le bouton reste mais pas la couche ni le son', () => {
    h.s.power = power({ on: false })
    mount({ others: ['b'], onOpenCamera: open })
    expect(screen.getByTestId('markers-toggle')).toBeInTheDocument()
    expect(screen.queryByTestId('layer')).toBeNull()
    expect(screen.queryByTestId('live-audio')).toBeNull()
  })
  it('pendant un clip : les repères se voient et ouvrent l’autre caméra à l’instant où en est le clip', () => {
    mount({ others: ['b'], onOpenCamera: open, events: [event('a')] })
    expect(screen.getByTestId('layer')).toBeInTheDocument()
    pick(event('a'))
    expect(screen.getByTestId('markers-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('layer')).toBeInTheDocument()
    h.markersLayer.onOpen('b')
    // Sans position de lecture connue, le début du clip.
    expect(open).toHaveBeenLastCalledWith('b', expect.any(Number), 10, false)
  })
  it('pendant un clip sans position de lecture : le début de la vidéo, sinon celui de l’événement', () => {
    mount({ others: ['b'], onOpenCamera: open, events: [event('a'), event('c', { clip_started_at: null })] })
    pick(event('a'), null)
    h.markersLayer.onOpen('b')
    expect(open).toHaveBeenLastCalledWith('b', 995, 10, false)
    pick(event('c', { clip_started_at: null }), null)
    h.markersLayer.onOpen('b')
    expect(open).toHaveBeenLastCalledWith('b', 1000, 10, false)
  })
  it('pendant la modification de la zone : les repères sont cachés', () => {
    mount({ others: ['b'], onOpenCamera: open })
    fireEvent.click(screen.getByRole('button', { name: 'Zone de surveillance' }))
    expect(screen.queryByTestId('layer')).toBeNull()
    expect(screen.getByTestId('markers-toggle')).toBeInTheDocument()
  })
})

describe('CameraCard : température, lampe, prise', () => {
  it('en direct : sur la vidéo (bureau) ou dans les détails (téléphone)', () => {
    h.s.sensors = [sensor]
    h.s.lamp = lamp
    h.s.plug = plug
    const desktop = mount()
    expect(screen.getByTestId('overlay')).toHaveTextContent('9,5 °C')
    expect(screen.queryByTestId('details')).toBeNull()
    desktop.unmount()
    h.s.mobile = true
    mount()
    expect(screen.getByTestId('details')).toHaveTextContent('9,5 °C')
    expect(screen.queryByTestId('overlay')).toBeNull()
  })
  it('une caméra sans détecteur ni lampe n’a rien', () => {
    mount({ camera: camera({ name: 'autre' }) })
    expect(screen.queryByTestId('overlay')).toBeNull()
  })
  it('pas de température hors direct (clip ou image passée)', () => {
    h.s.sensors = [sensor]
    mount({ events: [event('a')] })
    pick(event('a'))
    expect(screen.queryByTestId('overlay')).toBeNull()
    act(() => h.timeline.onEvent(null, null))
    act(() => h.timeline.onCursor(900))
    expect(screen.queryByTestId('overlay')).toBeNull()
  })
  it('un détecteur absent de la liste, sans lampe ni prise : pas d’indicateurs', () => {
    mount()
    expect(screen.queryByTestId('overlay')).toBeNull()
  })
  it('l’autre caméra a son détecteur', () => {
    h.s.sensors = [{ ...sensor, id: '57' }]
    mount({ camera: camera({ name: 'voliere-exterieur' }) })
    expect(screen.getByTestId('overlay')).toBeInTheDocument()
  })
})

describe('CameraCard : le clip', () => {
  const e = event('a')

  it('ouvert directement sur un clip', () => {
    mount({ events: [e], initialEventId: 'a' })
    expect(h.clip.path).toBe('/clips/a')
    expect(h.timeline.playhead).toBe(995)
    expect(h.timeline.selectedEventId).toBe('a')
  })
  it('un événement sans clip n’est pas ouvert directement', () => {
    mount({ events: [event('a', { clip: null })], initialEventId: 'a' })
    expect(h.clip).toBeNull()
  })
  it('un événement sans début de clip : le début du mouvement', () => {
    mount({ events: [event('a', { clip_started_at: null })], initialEventId: 'a' })
    expect(h.timeline.playhead).toBe(1000)
  })
  it('un identifiant inconnu : le direct', () => {
    mount({ events: [e], initialEventId: 'zzz' })
    expect(h.clip).toBeNull()
  })

  it('un clic de la frise ouvre le clip, le marque lu, relance la lecture', () => {
    const onRead = vi.fn()
    mount({ events: [e], onRead })
    pick(e)
    expect(h.clip.path).toBe('/clips/a')
    expect(onRead).toHaveBeenCalledWith('a')
    expect(h.clip.restart).toBe(1)
    pick(e)
    expect(h.clip.restart).toBe(2)
  })
  it('sans rappel de lecture, ouvrir un clip ne casse rien', () => {
    mount({ events: [e] })
    pick(e)
    expect(h.clip).not.toBeNull()
  })
  it('la version à jour de la liste remplace celle qu’on avait cliquée', () => {
    const { rerender } = mount({ events: [event('a', { saved: false })] })
    pick(e)
    rerender(<CameraCard apiKey="k" camera={camera()} events={[event('a', { saved: true })]} />)
    expect(screen.getByRole('tab', { name: 'Sauvegardé' })).toHaveAttribute('aria-selected', 'true')
  })
  it('un événement disparu de la liste garde son clip', () => {
    const { rerender } = mount({ events: [e] })
    pick(e)
    rerender(<CameraCard apiKey="k" camera={camera()} events={[]} />)
    expect(h.clip.path).toBe('/clips/a')
  })

  it('la lecture avance : position et durée', () => {
    mount({ events: [e] })
    pick(e)
    act(() => h.clip.onTime(10))
    expect(h.timeline.playhead).toBe(1000 - 5 + 10)
    act(() => h.clip.onDuration(30))
    expect(h.timeline.clipRange).toEqual({ start: 995, end: 1025 })
  })
  it('un clip sans fichier original n’a pas de plage', () => {
    mount({ events: [event('a', { clip: null })] })
    pick(event('a', { clip: null }))
    act(() => h.timeline.onEvent(event('a', { clip: null }), 995))
    expect(h.timeline.clipRange).toBeNull()
  })
  it('même clip rouvert : garde sa durée ; autre événement : l’oublie ; fermeture : l’oublie', () => {
    const b = event('b')
    mount({ events: [e, b] })
    pick(e)
    act(() => h.clip.onDuration(30))
    pick(e)
    expect(h.timeline.clipRange).not.toBeNull()
    pick(b)
    expect(h.timeline.clipRange).toBeNull()
    act(() => h.clip.onDuration(12))
    act(() => h.timeline.onEvent(null, null))
    expect(h.clip).toBeDefined()
    expect(h.timeline.selectedEventId).toBe('')
  })
  it('la vidéo prête remplace l’image', () => {
    mount({ events: [e] })
    pick(e)
    expect(screen.getByTestId('media')).toContainElement(document.querySelector('img'))
    act(() => h.clip.onReady())
    expect(document.querySelector('img')).toBeNull()
  })
  it('un clip qui ne se lit pas : son message remplace l’image ; fermer revient au direct', () => {
    mount({ events: [e] })
    pick(e)
    act(() => h.clip.onFailure())
    expect(document.querySelector('img')).toBeNull()
    act(() => h.clip.onClose())
    expect(screen.getByTestId('timeline')).toBeInTheDocument()
    expect(h.clip).toBeDefined()
    expect(document.querySelector('img')).not.toBeNull()
  })
  it('son du clip', () => {
    mount({ events: [event('a', { clip_audio: '/clips/a/audio' })] })
    pick(event('a', { clip_audio: '/clips/a/audio' }))
    expect(h.clip.audioSrc).toBe('/clips/a/audio')
  })

  it('un événement en cours ou pas encore copié : cadre noir qui dit ce qu’on attend', () => {
    const first = mount({ events: [event('a', { clip: null, ended_at: null })] })
    pick(event('a', { clip: null, ended_at: null }))
    expect(screen.getByText(/Événement en cours/)).toBeInTheDocument()
    first.unmount()
    const recent = event('b', { clip: null, ended_at: h.s.now - 60 })
    mount({ events: [recent] })
    pick(recent)
    expect(screen.getByText(/en cours de copie/)).toBeInTheDocument()
  })
  it('un événement fini depuis plus de 10 minutes et sans clip : il n’y en aura pas', () => {
    const old = event('c', { clip: null, ended_at: h.s.now - 601 })
    mount({ events: [old] })
    pick(old)
    expect(screen.getByText(/Pas de clip pour cet événement/)).toBeInTheDocument()
    expect(screen.queryByText(/en cours de copie/)).toBeNull()
  })

  it('une image d’un instant passé', () => {
    mount()
    act(() => h.timeline.onCursor(900))
    expect(screen.getByTestId('snapshot')).toHaveTextContent('900')
    expect(screen.queryByRole('tab', { name: 'L' })).toBeNull()
  })
})

describe('CameraCard : version du clip', () => {
  const e = event('a')
  it('sur PC : le clip se lit en H.265 (l’original), sans choix de version', () => {
    mount({ events: [e] })
    pick(e)
    expect(h.clip.path).toBe('/clips/a')
    expect(screen.queryByRole('tab', { name: /H\.26/ })).toBeNull()
  })
  it('sur téléphone : la copie légère H.264 joue (le 4K ne se lit pas), sans choix', () => {
    h.s.mobile = true
    mount({ events: [e] })
    pick(e)
    expect(screen.queryByRole('tab', { name: /H\.26/ })).toBeNull()
    expect(h.clip.path).toBe('/clips/a/h264')
  })
  it('sans copie légère, l’original partout', () => {
    h.s.mobile = true
    mount({ events: [event('a', { clip_h264: null })] })
    pick(event('a', { clip_h264: null }))
    expect(h.clip.path).toBe('/clips/a')
  })
})

describe('CameraCard : sauvegarde et partage', () => {
  const e = event('a')
  it('sauvegarde, puis libère ; le même état ne fait rien', async () => {
    vi.mocked(api.setClipSaved).mockResolvedValue(undefined)
    mount({ events: [e] })
    pick(e)
    fireEvent.click(screen.getByRole('tab', { name: 'Non sauvegardé' }))
    expect(api.setClipSaved).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Sauvegardé' }))
    expect(api.setClipSaved).toHaveBeenCalledWith('k', 'a', true)
    fireEvent.click(screen.getByRole('tab', { name: 'Non sauvegardé' }))
    expect(api.setClipSaved).toHaveBeenLastCalledWith('k', 'a', false)
  })
  it('un échec remet l’état d’avant', async () => {
    vi.mocked(api.setClipSaved).mockRejectedValue(new Error('x'))
    mount({ events: [e] })
    pick(e)
    fireEvent.click(screen.getByRole('tab', { name: 'Sauvegardé' }))
    await act(flush)
    expect(screen.getByRole('tab', { name: 'Non sauvegardé' })).toHaveAttribute('aria-selected', 'true')
  })
  it('plus de bouton Partager dans le détail d’une caméra, clip sauvegardé ou non', () => {
    mount({ events: [event('a', { saved: true })] })
    pick(event('a', { saved: true }))
    expect(screen.queryByRole('button', { name: /Partager/ })).toBeNull()
    expect(document.querySelector('[data-testid="share"]')).toBeNull()
  })
  it('sur téléphone : pas d’interrupteur « Sauvegardé »', () => {
    h.s.mobile = true
    mount({ events: [event('a', { saved: true })] })
    pick(event('a', { saved: true }))
    expect(screen.queryByRole('tab', { name: 'Sauvegardé' })).toBeNull()
  })
  it('sur téléphone, un clip non sauvegardé : rien dans les détails', () => {
    h.s.mobile = true
    mount({ events: [e] })
    pick(e)
    expect(screen.queryByTestId('details')).toBeNull()
  })
  it('un événement sans clip n’a pas d’interrupteur', () => {
    mount({ events: [event('a', { clip: null })] })
    pick(event('a', { clip: null }))
    expect(screen.queryByRole('tab', { name: 'Sauvegardé' })).toBeNull()
  })
  it('changer d’état sans clip choisi ne fait rien (frise fermée)', () => {
    mount({ events: [e] })
    pick(e)
    act(() => h.timeline.onEvent(null, null))
    expect(api.setClipSaved).not.toHaveBeenCalled()
  })
})

describe('CameraCard : zone de surveillance et enregistrement', () => {
  it('le bouton montre ou cache l’éditeur de zone, « Toute l’image » remet', () => {
    h.s.zone = { ...h.s.zone, reduced: true, failed: true, reset: vi.fn() }
    mount()
    expect(screen.queryByTestId('zone-editor')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Zone de surveillance' }))
    expect(screen.getByTestId('zone-editor')).toBeInTheDocument()
    expect(screen.getByText('Zone non enregistrée')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Toute l’image' }))
    expect(h.s.zone.reset).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Zone de surveillance' }))
    expect(screen.queryByTestId('zone-editor')).toBeNull()
  })
  it('zone intacte : ni remise à zéro ni message', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Zone de surveillance' }))
    expect(screen.queryByRole('button', { name: 'Toute l’image' })).toBeNull()
    expect(screen.queryByText('Zone non enregistrée')).toBeNull()
  })
  it('sur téléphone : le rond d’enregistrement oui, la zone non ; ni caméra éteinte, ni hors direct', () => {
    h.s.mobile = true
    const phone = mount()
    expect(screen.queryByRole('button', { name: 'Zone de surveillance' })).toBeNull()
    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeInTheDocument()
    phone.unmount()
    h.s.mobile = false
    h.s.power = power({ on: false })
    const off = mount()
    expect(screen.queryByRole('button', { name: 'Zone de surveillance' })).toBeNull()
    off.unmount()
    h.s.power = null
    mount()
    act(() => h.timeline.onCursor(900))
    expect(screen.queryByRole('button', { name: 'Zone de surveillance' })).toBeNull()
  })
  it('enregistrer un clip : lance, puis arrête avec le temps écoulé', () => {
    const toggle = vi.fn()
    h.s.recorder = { ...h.s.recorder, toggle }
    const { unmount } = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer un clip' }))
    expect(toggle).toHaveBeenCalled()
    unmount()
    h.s.recorder = { ...h.s.recorder, recording: true, seconds: 72 }
    mount()
    expect(screen.getByRole('button', { name: 'Arrêter l’enregistrement (1:12)' })).toBeInTheDocument()
  })
  it('échec d’enregistrement et message de copie', () => {
    h.s.recorder = { ...h.s.recorder, failed: true, stopped: true }
    mount()
    expect(screen.getByText('Enregistrement impossible')).toBeInTheDocument()
    expect(screen.getByText(/en cours de copie par House Sync/)).toBeInTheDocument()
  })
  it('« arrêté » pendant qu’on enregistre encore : pas de message', () => {
    h.s.recorder = { ...h.s.recorder, recording: true, stopped: true }
    mount()
    expect(screen.queryByText(/en cours de copie par House Sync/)).toBeNull()
  })
})

describe('CameraCard : vue en grand, caméra tournée', () => {
  it('l’agrandissement est délégué à la vue en grand', () => {
    const open = vi.fn()
    const close = vi.fn()
    h.s.big = { ...h.s.big, open, close }
    const onBack = vi.fn()
    mount({ onBack })
    fireEvent.click(screen.getByText('agrandir'))
    fireEvent.click(screen.getByText('réduire'))
    fireEvent.click(screen.getByText('retour'))
    expect([open, close, onBack].map((f) => f.mock.calls.length)).toEqual([1, 1, 1])
  })
  it('en grand : l’heure présente, ou celle du curseur', () => {
    h.s.big = { ...h.s.big, big: true }
    mount()
    expect(screen.getByTestId('clock').textContent).toMatch(/\d{2}:\d{2}:\d{2}/)
    act(() => h.timeline.onCursor(0))
    expect(screen.getByTestId('clock').textContent).toMatch(/\d{2}:\d{2}:\d{2}/)
    expect(h.s.pinchArgs[2]).toBe('image:big')
  })
  it('le zoom : actif en grand ou sur téléphone, molette seulement sur bureau en grand', () => {
    mount()
    expect(h.s.pinchArgs).toEqual([false, false, 'live', false])
    h.s.big = { ...h.s.big, big: true }
    mount()
    expect(h.s.pinchArgs).toEqual([true, true, 'live:big', true])
    h.s.mobile = true
    mount()
    expect(h.s.pinchArgs[3]).toBe(false)
  })
  it('l’identifiant du zoom suit le clip choisi', () => {
    mount({ events: [event('a')] })
    pick(event('a'))
    expect(h.s.pinchArgs[2]).toBe('a')
  })
  it('caméra posée de côté : tournée, commandes droites dans un cadre dédié', () => {
    const turned = event('a', { orientation: 'portrait' })
    mount({ camera: camera({ orientation: 'portrait' }), events: [turned] })
    expect(h.card.portraitMedia).toBe(true)
    pick(turned)
    const frame = document.querySelector('[data-rotated-frame]') as HTMLElement
    expect(frame).not.toBeNull()
    // le cadre des commandes devient l'hôte du lecteur
    expect(frame.children).toHaveLength(2)
    expect(h.clip.controlsHost).toBe(frame.children[1])
  })
  it('un clip pris en paysage sur une caméra tournée reste en paysage', () => {
    mount({ camera: camera({ orientation: 'portrait' }), events: [event('a', { orientation: 'landscape' })] })
    pick(event('a', { orientation: 'landscape' }))
    expect(h.card.portraitMedia).toBe(false)
  })
  it('le zoom au doigt est coupé pendant le dessin de la zone', () => {
    mount()
    expect(h.card.mediaGesture).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Zone de surveillance' }))
    expect(h.card.mediaGesture).toBeUndefined()
  })
})

describe('CameraCard : défilement des images', () => {
  it('les flèches sont dans la frise une fois une image choisie, pas en direct', () => {
    mount()
    expect(screen.queryByLabelText('Plus vite, ou en avant')).toBeNull()
    act(() => h.timeline.onCursor(900))
    expect(screen.getByLabelText('Plus vite, ou en avant')).toBeInTheDocument()
    expect(h.timeline.controls).toBeTruthy()
    expect(screen.getByTestId('timeline')).toContainElement(screen.getByLabelText('Plus vite, ou en avant'))
  })

  it('▶ accélère : la frise et le fondu suivent la vitesse', () => {
    mount()
    act(() => h.timeline.onCursor(900))
    expect(h.timeline.rate).toBe(1)
    fireEvent.click(screen.getByLabelText('Plus vite, ou en avant'))
    expect(h.timeline.rate).toBe(2)
    expect(screen.getByText('×2')).toBeInTheDocument()
  })

  it('◀ depuis ×1 arrête le temps (×0), puis fait reculer', () => {
    mount()
    act(() => h.timeline.onCursor(900))
    fireEvent.click(screen.getByLabelText('Plus lent, ou en arrière'))
    expect(h.timeline.rate).toBe(0)
    fireEvent.click(screen.getByLabelText('Plus lent, ou en arrière'))
    expect(h.timeline.rate).toBe(-1)
  })

  it('à ×0, les boutons « image précédente / suivante » appellent le pas de la frise', () => {
    mount()
    act(() => h.timeline.onCursor(900))
    const step = vi.fn()
    h.timeline.stepRef.current = step
    fireEvent.click(screen.getByLabelText('Plus lent, ou en arrière'))
    fireEvent.click(screen.getByLabelText('Image suivante'))
    expect(step).toHaveBeenLastCalledWith(1)
    fireEvent.click(screen.getByLabelText('Image précédente'))
    expect(step).toHaveBeenLastCalledWith(-1)
  })

  it('le retour au direct remet la vitesse à ×1', () => {
    mount()
    act(() => h.timeline.onCursor(900))
    fireEvent.click(screen.getByLabelText('Plus vite, ou en avant'))
    act(() => h.timeline.onCursor(null))
    act(() => h.timeline.onCursor(900))
    expect(h.timeline.rate).toBe(1)
  })

  it('pas de flèches pendant un clip', () => {
    mount()
    act(() => h.timeline.onCursor(900))
    pick(event('a'))
    expect(screen.queryByLabelText('Plus vite, ou en avant')).toBeNull()
  })

  it('en vue en grand, les flèches passent sur la vidéo (overlay) et plus dans la frise', () => {
    h.s.big = { ...h.s.big, big: true }
    mount()
    act(() => h.timeline.onCursor(900))
    expect(h.timeline.controls).toBeUndefined()
    expect(screen.getByTestId('overlay')).toContainElement(screen.getByLabelText('Plus vite, ou en avant'))
  })
})

describe('CameraCard : défilement des images sur téléphone en vue en grand', () => {
  it('sans indicateurs, les flèches seules sont dans l’overlay', () => {
    h.s.mobile = true
    h.s.big = { ...h.s.big, big: true }
    mount()
    act(() => h.timeline.onCursor(900))
    expect(screen.getByTestId('overlay')).toContainElement(screen.getByLabelText('Plus vite, ou en avant'))
  })
})
