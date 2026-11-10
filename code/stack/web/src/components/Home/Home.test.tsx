import { render, screen } from '@testing-library/react'
import type { Camera } from '@/types'
import Home from './Home'

vi.mock('@/components/HouseMap', () => ({
  default: (props: { apiKey: string; cameras: Camera[]; isRead: (id: string) => boolean; onOpenPlug: () => void }) => (
    <button data-testid="map" onClick={props.onOpenPlug}>
      {props.apiKey}:{props.cameras.length}:{String(props.isRead('x'))}
    </button>
  ),
}))
const h = vi.hoisted(() => ({ mobile: false }))
vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/components/GuestLink', () => ({ default: (props: { apiKey: string }) => <i data-testid="guest">{props.apiKey}</i> }))

describe('Home', () => {
  beforeEach(() => {
    h.mobile = false
  })

  it('montre la carte de la maison puis le lien de la page invité', () => {
    const onOpenPlug = vi.fn()
    render(
      <Home
        apiKey="k"
        cameras={[{ name: 'a' } as Camera]}
        events={[]}
        isRead={() => true}
        onOpenCamera={vi.fn()}
        onOpenAc={vi.fn()}
        onOpenShutter={vi.fn()}
        onOpenPlug={onOpenPlug}
      />,
    )
    expect(screen.getByTestId('map')).toHaveTextContent('k:1:true')
    expect(screen.getByTestId('guest')).toHaveTextContent('k')
    screen.getByTestId('map').click()
    expect(onOpenPlug).toHaveBeenCalledTimes(1)
  })

  it('sur téléphone, le lien de la page invité n’est plus sous la carte (il est dans le menu du haut)', () => {
    h.mobile = true
    render(
      <Home
        apiKey="k"
        cameras={[]}
        events={[]}
        isRead={() => false}
        onOpenCamera={vi.fn()}
        onOpenAc={vi.fn()}
        onOpenShutter={vi.fn()}
        onOpenPlug={vi.fn()}
      />,
    )
    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.queryByTestId('guest')).toBeNull()
  })
})
