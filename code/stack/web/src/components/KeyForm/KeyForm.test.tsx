import { fireEvent, render, screen } from '@testing-library/react'
import KeyForm from './KeyForm'

describe('KeyForm', () => {
  it('envoie la clé saisie puis vide le champ', () => {
    const onSubmit = vi.fn()
    render(<KeyForm busy={false} onSubmit={onSubmit} />)
    const input = document.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'secret' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(onSubmit).toHaveBeenCalledWith('secret')
    expect(input.value).toBe('')
  })
  it('n’envoie rien si le champ est vide', () => {
    const onSubmit = vi.fn()
    render(<KeyForm busy={false} onSubmit={onSubmit} />)
    fireEvent.submit(document.querySelector('form') as HTMLFormElement)
    expect(onSubmit).not.toHaveBeenCalled()
  })
  it('désactive le champ pendant la vérification', () => {
    render(<KeyForm busy onSubmit={vi.fn()} />)
    expect(document.querySelector('input')).toBeDisabled()
    expect(screen.getByText(/La clé de House API/)).toBeInTheDocument()
  })
})
