import { fireEvent, render, screen } from '@testing-library/react'
import FadeButton from './FadeButton'

const fade = vi.hoisted(() => ({ state: {} as Record<string, unknown>, toggle: vi.fn() }))
vi.mock('@/lib/useFade', () => ({ useFade: () => ({ ...fade.state, toggle: fade.toggle }) }))

const set = (state: Record<string, unknown>) => {
  fade.state = { fading: false, remaining: null, busy: false, failed: false, ...state }
}

describe('FadeButton', () => {
  it('rien pour une lampe éteinte hors extinction', () => {
    set({})
    const { container } = render(<FadeButton apiKey="k" lampId="26" on={false} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('lampe allumée : lance l’extinction', () => {
    set({})
    render(<FadeButton apiKey="k" lampId="26" on />)
    fireEvent.click(screen.getByRole('button'))
    expect(fade.toggle).toHaveBeenCalled()
  })
  it('extinction en cours : annule, avec le temps restant (même lampe éteinte)', () => {
    set({ fading: true, remaining: 872 })
    render(<FadeButton apiKey="k" lampId="26" on={false} />)
    expect(screen.getByRole('button').textContent).toContain('(14:32)')
  })
  it('extinction en cours sans temps connu', () => {
    set({ fading: true, remaining: null })
    render(<FadeButton apiKey="k" lampId="26" on />)
    expect(screen.getByRole('button').textContent).not.toContain('(')
  })
  it('occupé : désactivé ; échec : message', () => {
    set({ busy: true, failed: true })
    render(<FadeButton apiKey="k" lampId="26" on />)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/pas pu|impossible|échec/i)).toBeInTheDocument()
  })
})
