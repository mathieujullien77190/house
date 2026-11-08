import { render, screen } from '@testing-library/react'
import PageFrame from './PageFrame'
import { OPEN_LABEL } from './constants'

describe('PageFrame', () => {
  it('sans adresse, montre le texte de remplacement et aucune iframe', () => {
    const { container } = render(<PageFrame src="" title="Page" intro="Intro" emptyText="Pas encore" />)
    expect(screen.getByText('Pas encore')).toBeInTheDocument()
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('avec une adresse, montre l iframe et un lien sûr pour l ouvrir à part', () => {
    const { container } = render(<PageFrame src="https://exemple.fr/p" title="Page invité" intro="Intro" emptyText="Pas encore" />)
    expect(screen.getByText('Intro')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: OPEN_LABEL })
    expect(link).toHaveAttribute('href', 'https://exemple.fr/p')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    const frame = container.querySelector('iframe')
    expect(frame).toHaveAttribute('src', 'https://exemple.fr/p')
    expect(frame).toHaveAttribute('title', 'Page invité')
    expect(screen.queryByText('Pas encore')).toBeNull()
  })
})
