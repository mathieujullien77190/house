import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import KeyForm from '@/components/KeyForm'

describe('KeyForm', () => {
  it('envoie la clé saisie et vide le champ', () => {
    const onSubmit = vi.fn()
    render(<KeyForm busy={false} onSubmit={onSubmit} />)
    const input = screen.getByLabelText('Clé secrète') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ma-cle' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrer' }))
    expect(onSubmit).toHaveBeenCalledWith('ma-cle')
    expect(input.value).toBe('')
  })

  it('n’envoie rien quand le champ est vide', () => {
    const onSubmit = vi.fn()
    const { container } = render(<KeyForm busy={false} onSubmit={onSubmit} />)
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('est désactivé pendant la vérification', () => {
    render(<KeyForm busy onSubmit={() => undefined} />)
    expect((screen.getByLabelText('Clé secrète') as HTMLInputElement).disabled).toBe(true)
  })
})
