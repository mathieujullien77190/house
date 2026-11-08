import { fireEvent, render, screen } from '@testing-library/react'
import KeyForm from './KeyForm'
import { LABEL, SUBMIT_LABEL } from './constants'

describe('KeyForm', () => {
  it('le champ est un mot de passe nommé, avec l aide du parent', () => {
    render(<KeyForm value="" busy={false} hint="Demande-la à Mathieu" onChange={() => undefined} onSubmit={() => undefined} />)
    const input = screen.getByLabelText(LABEL)
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toBeRequired()
    expect(screen.getByText('Demande-la à Mathieu')).toBeInTheDocument()
  })

  it('renvoie la saisie au parent', () => {
    const onChange = vi.fn()
    render(<KeyForm value="" busy={false} hint="" onChange={onChange} onSubmit={() => undefined} />)
    fireEvent.change(screen.getByLabelText(LABEL), { target: { value: 'secret' } })
    expect(onChange).toHaveBeenCalledWith('secret')
  })

  it('l envoi est refusé tant que la clé est vide', () => {
    render(<KeyForm value="" busy={false} hint="" onChange={() => undefined} onSubmit={() => undefined} />)
    expect(screen.getByRole('button', { name: SUBMIT_LABEL })).toBeDisabled()
  })

  it('le formulaire envoie sans recharger la page', () => {
    const onSubmit = vi.fn()
    render(<KeyForm value="secret" busy={false} hint="" onChange={() => undefined} onSubmit={onSubmit} />)
    const button = screen.getByRole('button', { name: SUBMIT_LABEL })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('type', 'submit')
    // false : le submit natif (rechargement) a été empêché.
    expect(fireEvent.submit(button.closest('form') as HTMLFormElement)).toBe(false)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('pendant l envoi, champ et bouton sont désactivés', () => {
    render(<KeyForm value="secret" busy hint="" onChange={() => undefined} onSubmit={() => undefined} />)
    expect(screen.getByLabelText(LABEL)).toBeDisabled()
    expect(screen.getByRole('button', { name: SUBMIT_LABEL })).toBeDisabled()
  })
})
