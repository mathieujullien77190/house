import { render, screen } from '@testing-library/react'
import SpecList from './SpecList'

describe('SpecList', () => {
  it('liste chaque nom avec sa valeur', () => {
    const { container } = render(
      <SpecList
        items={[
          { id: 'a', label: 'Adresse', value: '192.168.1.141' },
          { id: 'b', label: 'Port', value: '9000' },
        ]}
      />,
    )
    expect(container.querySelectorAll('dt')).toHaveLength(2)
    expect(screen.getByText('Adresse').nextElementSibling).toHaveTextContent('192.168.1.141')
    expect(screen.getByText('Port').nextElementSibling).toHaveTextContent('9000')
  })

  it('reste vide sans élément', () => {
    const { container } = render(<SpecList items={[]} />)
    expect(container.querySelector('dl')?.children).toHaveLength(0)
  })
})
