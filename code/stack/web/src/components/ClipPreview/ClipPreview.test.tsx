import { fireEvent, render, screen } from '@testing-library/react'
import type { EventRow } from '@/types'
import ClipPreview from './ClipPreview'

vi.mock('@/components/ClipPlayer', () => ({
  default: (p: { path: string; audioSrc?: string; onClose: () => void }) => (
    <i onClick={p.onClose}>
      lecteur {p.path} {p.audioSrc ?? ''}
    </i>
  ),
}))
vi.mock('@/components/PortraitClip', () => ({ default: (p: { path: string; onClose: () => void }) => <i onClick={p.onClose}>portrait {p.path}</i> }))

const event = (patch: Partial<EventRow> = {}): EventRow =>
  ({
    id: 'e1',
    camera: 'voliere-exterieur',
    label: 'mouvement',
    started_at: 1_700_000_000,
    ended_at: 1_700_000_010,
    clip: '/clips/e1',
    clip_h264: '/clips/e1/h264',
    clip_audio: null,
    clip_started_at: 1_700_000_000,
    saved: true,
    note: '',
    emoji: '🦊',
    orientation: 'landscape',
    ...patch,
  }) as EventRow

describe('ClipPreview', () => {
  it('montre l’emoji, la caméra et le clip (la copie légère) ; un clic sur la ligne ouvre le clip', () => {
    const onOpen = vi.fn()
    render(<ClipPreview apiKey="k" event={event()} onOpen={onOpen} />)
    expect(screen.getByText('lecteur /clips/e1/h264')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('🦊')
    expect(screen.getByRole('button')).toHaveTextContent('voliere-exterieur')
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('montre la note, le son, et lit un clip en portrait droit', () => {
    render(
      <ClipPreview apiKey="k" event={event({ note: 'renard', orientation: 'portrait', clip_audio: '/clips/e1/audio' })} onOpen={vi.fn()} />,
    )
    expect(screen.getByText('renard')).toBeInTheDocument()
    expect(screen.getByText('portrait /clips/e1/h264')).toBeInTheDocument()
  })

  it('fermer le lecteur ne fait rien (l’aperçu reste)', () => {
    render(<ClipPreview apiKey="k" event={event()} onOpen={vi.fn()} />)
    fireEvent.click(screen.getByText('lecteur /clips/e1/h264'))
    expect(screen.getByText('lecteur /clips/e1/h264')).toBeInTheDocument()
  })

  it('un clip en portrait sans son est lu droit aussi', () => {
    render(<ClipPreview apiKey="k" event={event({ orientation: 'portrait' })} onOpen={vi.fn()} />)
    expect(screen.getByText('portrait /clips/e1/h264')).toBeInTheDocument()
  })

  it('un clip en paysage avec du son le passe au lecteur', () => {
    render(<ClipPreview apiKey="k" event={event({ clip_audio: '/clips/e1/audio' })} onOpen={vi.fn()} />)
    expect(screen.getByText('lecteur /clips/e1/h264 /clips/e1/audio')).toBeInTheDocument()
  })

  it('un clip sans fichier le dit', () => {
    render(<ClipPreview apiKey="k" event={event({ clip: null, clip_h264: null })} onOpen={vi.fn()} />)
    expect(screen.getByText('Ce clip n’est plus disponible.')).toBeInTheDocument()
  })
})
