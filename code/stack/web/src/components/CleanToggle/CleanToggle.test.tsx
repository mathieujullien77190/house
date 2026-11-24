import { fireEvent, render, screen } from '@testing-library/react'
import CleanToggle from './CleanToggle'
import { BORDER_HIDDEN_CLASS, BORDER_SHOWN_CLASS, LABEL_HIDE, LABEL_SHOW } from './constants'

describe('CleanToggle', () => {
  it('composants montrés : propose de les cacher, cadre accentué, un clic prévient le parent', () => {
    const onToggle = vi.fn()
    render(<CleanToggle visible onToggle={onToggle} />)
    const button = screen.getByRole('button', { name: LABEL_HIDE })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass(BORDER_SHOWN_CLASS)
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
  it('composants cachés : propose de les montrer, cadre discret', () => {
    render(<CleanToggle visible={false} onToggle={() => undefined} />)
    const button = screen.getByRole('button', { name: LABEL_SHOW })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveClass(BORDER_HIDDEN_CLASS)
  })
})
