import { render, screen } from '@testing-library/react'
import SectionTitle from './SectionTitle'

describe('SectionTitle', () => {
  it('montre le texte et son détail', () => {
    render(<SectionTitle text="Caméras" detail="6 en service" />)
    const title = screen.getByRole('heading', { level: 2 })
    expect(title).toHaveTextContent('Caméras6 en service')
    expect(screen.getByText('6 en service').tagName).toBe('SPAN')
  })

  it('sans détail, pas de span', () => {
    render(<SectionTitle text="Caméras" />)
    expect(screen.getByRole('heading').querySelector('span')).toBeNull()
  })
})
