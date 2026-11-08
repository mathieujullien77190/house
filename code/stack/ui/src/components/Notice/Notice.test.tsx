import { render, screen } from '@testing-library/react'
import Notice from './Notice'
import { ERROR_CLASS, MUTED_CLASS } from './constants'

describe('Notice', () => {
  it('est discrète par défaut', () => {
    render(<Notice text="Rien à signaler" />)
    expect(screen.getByText('Rien à signaler').className).toBe(MUTED_CLASS)
  })

  it('prend la couleur d erreur', () => {
    render(<Notice text="Panne" tone="error" />)
    expect(screen.getByText('Panne').className).toBe(ERROR_CLASS)
  })
})
