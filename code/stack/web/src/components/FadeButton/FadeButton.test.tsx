import { fireEvent, render, screen } from '@testing-library/react'
import type { useFade } from '@/lib/useFade'
import FadeButton from './FadeButton'

type Fade = ReturnType<typeof useFade>

const toggle = vi.fn()
const fade = (state: Partial<Fade> = {}): Fade => ({ fading: false, remaining: null, level: null, busy: false, failed: false, toggle, ...state })

describe('FadeButton', () => {
  it('rien pour une lampe éteinte hors extinction', () => {
    const { container } = render(<FadeButton fade={fade()} on={false} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('lampe allumée : lance l’extinction', () => {
    render(<FadeButton fade={fade()} on />)
    fireEvent.click(screen.getByRole('button'))
    expect(toggle).toHaveBeenCalled()
  })
  it('extinction en cours : annule, avec le temps restant (même lampe éteinte)', () => {
    render(<FadeButton fade={fade({ fading: true, remaining: 872 })} on={false} />)
    expect(screen.getByRole('button').textContent).toContain('(14:32)')
  })
  it('extinction en cours sans temps connu', () => {
    render(<FadeButton fade={fade({ fading: true, remaining: null })} on />)
    expect(screen.getByRole('button').textContent).not.toContain('(')
  })
  it('occupé : désactivé ; échec : message', () => {
    render(<FadeButton fade={fade({ busy: true, failed: true })} on />)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/pas pu|impossible|échec/i)).toBeInTheDocument()
  })
})
