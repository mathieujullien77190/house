import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Checkbox from './Checkbox'

describe('Checkbox', () => {
  it('renvoie la nouvelle valeur au parent, le texte est cliquable aussi', () => {
    const onChange = vi.fn()
    render(<Checkbox label="Clips" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByText('Clips'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('reflète la valeur du parent', () => {
    const onChange = vi.fn()
    render(<Checkbox label="Clips" checked onChange={onChange} />)
    const box = screen.getByRole('checkbox', { name: 'Clips' })
    expect(box).toBeChecked()
    fireEvent.click(box)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('peut être désactivée', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Clips" checked={false} onChange={onChange} disabled />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('est active par défaut', () => {
    render(<Checkbox label="Clips" checked={false} onChange={() => undefined} />)
    expect(screen.getByRole('checkbox')).toBeEnabled()
  })
})
