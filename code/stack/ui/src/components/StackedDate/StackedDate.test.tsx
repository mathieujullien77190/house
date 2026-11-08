import { render, screen } from '@testing-library/react'
import StackedDate from './StackedDate'

describe('StackedDate', () => {
  it('met le jour puis l heure, chacun sur sa ligne', () => {
    const { container } = render(<StackedDate date="07/11/2026" time="19:25:01" />)
    const lines = container.querySelectorAll('span > span')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveTextContent('07/11/2026')
    expect(lines[1]).toHaveTextContent('19:25:01')
    expect(screen.getByText('19:25:01')).toBeInTheDocument()
  })
})
