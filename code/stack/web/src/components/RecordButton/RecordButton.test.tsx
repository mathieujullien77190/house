import { fireEvent, render, screen } from '@testing-library/react'
import RecordButton from './RecordButton'
import { BUTTON_CLASS, ICON_IDLE_CLASS, ICON_RECORDING_CLASS, LABEL_START } from './constants'
import { elapsedLabel } from './helpers'

describe('RecordButton', () => {
  it('au repos : un rond gris, un clic commence', () => {
    const onToggle = vi.fn()
    render(<RecordButton recording={false} busy={false} seconds={0} onToggle={onToggle} />)
    const button = screen.getByRole('button', { name: LABEL_START })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveClass(...BUTTON_CLASS.split(' '))
    expect(button.firstElementChild).toHaveClass(...ICON_IDLE_CLASS.split(' '))
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
  it('pendant l’enregistrement : un rond rouge, le temps écoulé dans le nom', () => {
    render(<RecordButton recording busy={false} seconds={72} onToggle={() => undefined} />)
    const button = screen.getByRole('button', { name: 'Arrêter l’enregistrement (1:12)' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button.firstElementChild).toHaveClass(...ICON_RECORDING_CLASS.split(' '))
  })
  it('une demande en route : le bouton ne répond plus', () => {
    render(<RecordButton recording={false} busy seconds={0} onToggle={() => undefined} />)
    expect(screen.getByRole('button', { name: LABEL_START })).toBeDisabled()
  })
  it('elapsedLabel : minutes et secondes sur deux chiffres', () => {
    expect(elapsedLabel(0)).toBe('0:00')
    expect(elapsedLabel(125)).toBe('2:05')
  })
})
