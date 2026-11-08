import { render, screen } from '@testing-library/react'
import Totals from './Totals'

describe('Totals', () => {
  it('une carte par total : la valeur puis son nom', () => {
    render(
      <Totals
        totals={[
          { id: 'size', value: '49.2 Mo', label: 'Taille' },
          { id: 'clips', value: '12', label: 'Clips' },
        ]}
      />,
    )
    expect(screen.getByText('49.2 Mo').nextElementSibling).toHaveTextContent('Taille')
    expect(screen.getByText('12').nextElementSibling).toHaveTextContent('Clips')
  })

  it('reste vide sans total', () => {
    const { container } = render(<Totals totals={[]} />)
    expect(container.firstElementChild?.children).toHaveLength(0)
  })
})
