import { fireEvent, render, screen } from '@testing-library/react'
import type { Camera, EventRow } from '@/types'
import CameraMosaic from './CameraMosaic'

/* eslint-disable @typescript-eslint/no-explicit-any -- doubles : les props des composants remplacés sont inspectées librement */
const h = vi.hoisted(() => ({ stackWidth: vi.fn() }))

vi.mock('@/lib/useStackWidth', () => ({ useStackWidth: (...args: unknown[]) => h.stackWidth(...args) }))
vi.mock('@/components/LiveTile', () => ({
  default: (props: any) => (
    <div data-testid={`tile-${props.camera.name}`}>
      <button onClick={props.onOpen}>ouvrir {props.camera.name}</button>
      {props.onOpenClip ? <button onClick={props.onOpenClip}>clip {props.camera.name}</button> : null}
      <span>{props.read ? 'lu' : 'non lu'}</span>
    </div>
  ),
}))

const camera = (name: string, orientation: Camera['orientation'] = 'landscape'): Camera => ({ name, orientation })
const event = (id: string, cameraName: string, clip: string | null = `/clips/${id}`): EventRow => ({ id, camera: cameraName, clip }) as EventRow

const mount = (over: Partial<Parameters<typeof CameraMosaic>[0]> = {}) => {
  const onOpen = vi.fn()
  const view = render(
    <CameraMosaic
      apiKey="k"
      cameras={[camera('voliere-exterieur'), camera('voliere-interieur'), camera('autre', 'portrait')]}
      events={[]}
      isRead={() => false}
      onOpen={onOpen}
      {...over}
    />,
  )
  return { ...view, onOpen }
}

const order = () => [...document.querySelectorAll('[data-testid^=tile-]')].map((e) => e.getAttribute('data-testid'))
const wrapper = (name: string) => screen.getByTestId(`tile-${name}`).parentElement as HTMLElement

beforeEach(() => {
  h.stackWidth.mockClear()
})

describe('CameraMosaic : vignettes', () => {
  it('une vignette par caméra, dans l’ordre d’arrivée, les autres après', () => {
    mount({ cameras: [camera('autre'), camera('voliere-toit'), camera('salon-de-jardin'), camera('voliere-exterieur'), camera('voliere-interieur')] })
    expect(order()).toEqual(['tile-voliere-interieur', 'tile-voliere-toit', 'tile-voliere-exterieur', 'tile-salon-de-jardin', 'tile-autre'])
  })
  it('l’intérieur et le toit sont empilés dans la colonne 1, les autres suivent la grille', () => {
    mount({ cameras: [camera('voliere-toit'), camera('voliere-interieur'), camera('voliere-exterieur')] })
    const stack = wrapper('voliere-interieur').parentElement as HTMLElement
    expect(stack).toBe(wrapper('voliere-toit').parentElement)
    expect(stack.className).toContain('lg:col-start-1')
    expect(wrapper('voliere-exterieur').parentElement).toBe(stack.parentElement)
    expect(wrapper('voliere-exterieur').className).toContain('lg:col-start-2')
    expect(h.stackWidth).toHaveBeenCalled()
  })
  it('sans caméra à empiler : pas de colonne 1', () => {
    mount({ cameras: [camera('salon-de-jardin')] })
    expect(wrapper('salon-de-jardin').className).toContain('lg:col-start-3')
    expect(wrapper('salon-de-jardin').parentElement?.className).not.toContain('flex-col')
  })
  it('une caméra en portrait a une vignette à hauteur fixe ; l’extérieur en portrait resserre la colonne 2', () => {
    mount()
    expect(wrapper('autre').className).toContain('--big-h')
    expect(wrapper('voliere-interieur').className).not.toContain('--big-h')
    expect(wrapper('autre').parentElement?.className).not.toContain('298px')
  })
  it('l’extérieur en portrait : la grille a une colonne de la largeur de sa vidéo', () => {
    mount({ cameras: [camera('voliere-exterieur', 'portrait'), camera('voliere-interieur')] })
    expect(wrapper('voliere-exterieur').parentElement?.className).toContain('298px')
  })
  it('un clic ouvre la caméra ; la ligne du dernier événement ouvre son clip s’il en a un', () => {
    const events = [event('e2', 'voliere-interieur'), event('e1', 'voliere-interieur'), event('x', 'voliere-exterieur', null)]
    const { onOpen } = mount({ events, isRead: (id) => id === 'e2' })
    fireEvent.click(screen.getByText('ouvrir voliere-interieur'))
    expect(onOpen).toHaveBeenLastCalledWith('voliere-interieur')
    fireEvent.click(screen.getByText('clip voliere-interieur'))
    expect(onOpen).toHaveBeenLastCalledWith('voliere-interieur', 'e2')
    expect(screen.queryByText('clip voliere-exterieur')).toBeNull()
    expect(screen.getByTestId('tile-voliere-interieur')).toHaveTextContent(/^ouvrir voliere-interieurclip voliere-interieurlu$/)
    expect(screen.getByTestId('tile-voliere-exterieur')).toHaveTextContent('non lu')
  })
})
