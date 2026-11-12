import { fireEvent, render, screen } from '@testing-library/react'
import type { Camera, EventRow, HueSensor } from '@/types'
import LiveTile from './LiveTile'

/* eslint-disable @typescript-eslint/no-explicit-any -- états simulés des hooks */
const h = vi.hoisted(() => ({
  mobile: false,
  power: null as any,
  sensors: [] as any[],
  lamp: null as any,
  plug: null as any,
  duration: null as number | null,
  durationArgs: null as unknown[] | null,
}))

vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/lib/usePower', () => ({ usePower: () => ({ power: h.power }) }))
vi.mock('@/lib/useSensors', () => ({ useSensors: () => h.sensors }))
vi.mock('@/lib/useLamp', () => ({ useLamp: () => h.lamp }))
vi.mock('@/lib/usePlug', () => ({ usePlug: () => h.plug }))
vi.mock('@/lib/useClipDuration', () => ({
  useClipDuration: (...args: unknown[]) => {
    h.durationArgs = args
    return h.duration
  },
}))

beforeEach(() => {
  h.mobile = false
  h.power = null
  h.sensors = []
  h.lamp = null
  h.plug = null
  h.duration = null
  h.durationArgs = null
})

const camera = (over: Partial<Camera> = {}): Camera => ({ name: 'voliere-interieur', orientation: 'landscape', ...over })
const event = (over: Partial<EventRow> = {}): EventRow =>
  ({
    id: 'e',
    camera: 'voliere-interieur',
    label: 'person',
    started_at: 1000,
    ended_at: 1010,
    clip: '/clips/e',
    clip_h264: null,
    clip_started_at: null,
    ...over,
  }) as EventRow

const mount = (props: Partial<Parameters<typeof LiveTile>[0]> = {}) =>
  render(<LiveTile apiKey="k" camera={camera()} read={false} onOpen={vi.fn()} {...props} />)

describe('LiveTile', () => {
  it('montre le direct léger et « Aucun événement »', () => {
    mount()
    expect(document.querySelector('img')).toHaveAttribute('src', '/stream?camera=voliere-interieur')
    expect(screen.getByText('Aucun événement')).toBeInTheDocument()
  })
  it('sur téléphone, le flux mobile', () => {
    h.mobile = true
    mount()
    expect(document.querySelector('img')?.getAttribute('src')).toContain('screen=mobile')
  })
  it('un clic ouvre la caméra', () => {
    const onOpen = vi.fn()
    mount({ onOpen })
    fireEvent.click(screen.getByLabelText(/voliere-interieur/))
    expect(onOpen).toHaveBeenCalled()
  })
  it('éteinte ou en démarrage : cadre noir et légende', () => {
    h.power = { on: false, powered: false, streaming: false }
    const first = mount()
    expect(screen.getByText('Éteinte')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
    first.unmount()
    h.power = { on: true, powered: true, streaming: false }
    mount()
    expect(screen.getByText('Démarrage…')).toBeInTheDocument()
  })
  it('la pastille d’état devant le nom : nommée quand la caméra est éteinte, muette sinon', () => {
    h.power = { on: false, powered: false, streaming: false }
    const first = mount()
    expect(screen.getAllByRole('img', { name: 'Caméra éteinte' }).length).toBeGreaterThan(0)
    first.unmount()
    h.power = { on: true, powered: true, streaming: true }
    mount()
    expect(screen.queryByRole('img', { name: 'Caméra éteinte' })).toBeNull()
  })

  it('allumée qui diffuse : le direct', () => {
    h.power = { on: true, powered: true, streaming: true }
    mount()
    expect(document.querySelector('img')).not.toBeNull()
  })
  it('caméra tournée', () => {
    mount({ camera: camera({ orientation: 'portrait' }) })
    expect(document.querySelector('[data-rotated-frame]')).not.toBeNull()
  })

  it('dernier événement : libellé, début du clip, durée lue, repère Non lu / Lu', () => {
    h.duration = 14.4
    const first = mount({ lastEvent: event({ clip_started_at: 990, clip_h264: '/clips/e/h264' }) })
    expect(screen.getByText(/^Dernier : person · .* · 14 s$/)).toBeInTheDocument()
    expect(screen.getByText('Non lu')).toBeInTheDocument()
    expect(h.durationArgs).toEqual(['e', '/clips/e/h264'])
    first.unmount()
    mount({ lastEvent: event(), read: true })
    expect(screen.getByText('Lu ✓')).toBeInTheDocument()
    expect(h.durationArgs).toEqual(['e', '/clips/e'])
  })
  it('durée inconnue : pas de durée ; très courte : 1 s au moins', () => {
    mount({ lastEvent: event() })
    expect(screen.getByText(/^Dernier : person · [^·]+$/)).toBeInTheDocument()
    h.duration = 0.2
    mount({ lastEvent: event() })
    expect(screen.getAllByText(/1 s$/)).toHaveLength(1)
  })
  it('événement sans clip : pas de repère de lecture ; sans libellé : pas de trou', () => {
    mount({ lastEvent: event({ clip: null, clip_h264: null, label: '' }) })
    expect(screen.queryByText('Non lu')).toBeNull()
    expect(h.durationArgs).toEqual(['e', null])
  })
  it('la ligne du dernier événement ouvre le clip', () => {
    const onOpenClip = vi.fn()
    mount({ lastEvent: event(), onOpenClip })
    fireEvent.click(screen.getByText(/^Dernier/))
    expect(onOpenClip).toHaveBeenCalled()
  })

  it('température, lampe et prise sur la vignette', () => {
    h.sensors = [{ id: '54', name: 'motion interieur', temperature: 9.5 } as HueSensor]
    h.lamp = { id: '26', name: 'P', on: true, bri: 1, reachable: true }
    h.plug = { on: false }
    mount()
    expect(screen.getByText('9,5 °C')).toBeInTheDocument()
    expect(screen.getByLabelText('Prise : éteinte')).toBeInTheDocument()
  })
  it('pas d’indicateurs sur une caméra éteinte ni sur une caméra sans détecteur', () => {
    h.sensors = [{ id: '54', name: 'x', temperature: 9.5 } as HueSensor]
    h.power = { on: false, powered: false, streaming: false }
    const off = mount()
    expect(screen.queryByText('9,5 °C')).toBeNull()
    off.unmount()
    h.power = null
    mount({ camera: camera({ name: 'autre' }) })
    expect(screen.queryByText('9,5 °C')).toBeNull()
  })
})
