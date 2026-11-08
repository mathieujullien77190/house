import { fireEvent, render, screen } from '@testing-library/react'
import { Page, PageHeader } from './Page'
import { ERROR_CLASS, STATUS_CLASS } from './constants'

describe('Page', () => {
  it('entoure son contenu', () => {
    render(
      <Page>
        <span>contenu</span>
      </Page>,
    )
    expect(screen.getByText('contenu')).toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  it('montre le titre en texte simple sans onTitle', () => {
    render(<PageHeader title="Maison" status="À jour" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Maison' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('rend le titre cliquable avec onTitle', () => {
    const onTitle = vi.fn()
    render(<PageHeader title="Maison" status="" onTitle={onTitle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Maison' }))
    expect(onTitle).toHaveBeenCalledTimes(1)
  })

  it('l état est discret, ou rouge en erreur', () => {
    const { rerender } = render(<PageHeader title="M" status="ok" />)
    expect(screen.getByText('ok').className).toBe(STATUS_CLASS)
    rerender(<PageHeader title="M" status="panne" tone="error" />)
    expect(screen.getByText('panne').className).toBe(ERROR_CLASS)
  })

  it('pose les boutons à droite, seulement s il y en a', () => {
    const { container, rerender } = render(<PageHeader title="M" status="ok" />)
    expect(container.querySelector('header')?.children).toHaveLength(2)
    rerender(<PageHeader title="M" status="ok" actions={<button>Actualiser</button>} />)
    expect(screen.getByRole('button', { name: 'Actualiser' })).toBeInTheDocument()
    expect(container.querySelector('header')?.children).toHaveLength(3)
  })
})
