import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { CameraCardProps } from '@house/ui'
import CameraView from './CameraView'
import type { LanCamera } from './types'

interface BigState {
  big: boolean
  open: () => void
  close: () => void
  ref: { current: null }
}
const h = vi.hoisted(() => ({
  big: { big: false, open: () => undefined, close: () => undefined, ref: { current: null } } as BigState,
  mobile: false,
  card: null as CameraCardProps | null,
}))

vi.mock('@/lib/useMobile', () => ({ useMobile: () => h.mobile }))
vi.mock('@/lib/useBigView', () => ({ useBigView: () => h.big }))
vi.mock('@/lib/usePinchZoom', () => ({ usePinchZoom: () => ({}) }))
vi.mock('@/components/RotatedMedia', () => ({ default: ({ turned, children }: { turned: boolean; children: ReactNode }) => <div data-turned={String(turned)}>{children}</div> }))
vi.mock('@house/ui', () => ({
  CameraCard: (p: CameraCardProps) => {
    h.card = p
    return <div data-testid="card">{p.media}</div>
  },
  SnapshotImage: (p: { src: string; onSize?: () => void }) => (
    <button data-testid={`img-${p.src}`} onClick={() => p.onSize?.()}>
      {p.src}
    </button>
  ),
}))

const camera = (over: Partial<LanCamera> = {}): LanCamera => ({ id: 'voliere-interieur', name: 'Volière', orientation: 'landscape', ...over })

beforeEach(() => {
  h.big = { big: false, open: vi.fn(), close: vi.fn(), ref: { current: null } }
  h.mobile = false
})

describe('CameraView', () => {
  it('s’ouvre au montage et montre le direct léger tant que la vue n’est pas en grand', () => {
    render(<CameraView camera={camera()} lightUrl="/l" hdUrl="/h" onStreamError={vi.fn()} onClose={vi.fn()} />)
    expect(h.big.open).toHaveBeenCalled()
    expect(screen.getByTestId('img-/l')).toBeInTheDocument()
    expect(screen.queryByTestId('img-/h')).toBeNull()
    expect(h.card?.expanded).toBe(false)
  })

  it('sans adresse : image vide', () => {
    render(<CameraView camera={camera()} lightUrl={null} hdUrl={null} onStreamError={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('img-')).toBeInTheDocument()
  })

  it('en grand : le 4K se charge caché puis remplace le léger', () => {
    h.big = { ...h.big, big: true }
    h.mobile = true
    render(<CameraView camera={camera({ orientation: 'portrait' })} lightUrl="/l" hdUrl="/h" onStreamError={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('img-/h')).toBeInTheDocument()
    expect(screen.getByTestId('img-/l')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('img-/h'))
    expect(screen.queryByTestId('img-/l')).toBeNull()
    expect(h.card?.portraitMedia).toBe(true)
  })

  it('en grand sans 4K : le léger seul', () => {
    h.big = { ...h.big, big: true }
    render(<CameraView camera={camera()} lightUrl="/l" hdUrl={null} onStreamError={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByTestId('img-/l')).toBeInTheDocument()
  })

  it('referme la caméra quand la vue en grand se ferme, et relaie les erreurs de flux', () => {
    const onClose = vi.fn()
    const onStreamError = vi.fn()
    h.big = { ...h.big, big: true }
    const { rerender } = render(<CameraView camera={camera()} lightUrl="/l" hdUrl="/h" onStreamError={onStreamError} onClose={onClose} />)
    expect(onClose).not.toHaveBeenCalled()
    h.big = { ...h.big, big: false }
    rerender(<CameraView camera={camera()} lightUrl="/l" hdUrl="/h" onStreamError={onStreamError} onClose={onClose} />)
    expect(onClose).toHaveBeenCalledTimes(1)
    act(() => {
      screen.getByTestId('card').dispatchEvent(new Event('error', { bubbles: false }))
    })
    fireEvent.error(screen.getByTestId('img-/l'))
    expect(onStreamError).toHaveBeenCalled()
  })
})
