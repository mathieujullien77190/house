import { render, screen } from '@testing-library/react'
import RotatedMedia from './RotatedMedia'

describe('RotatedMedia', () => {
  it('sans rotation, rend le média tel quel', () => {
    const { container } = render(
      <RotatedMedia turned={false} overlay={<i>sur</i>}>
        <b>média</b>
      </RotatedMedia>,
    )
    expect(container.innerHTML).toBe('<b>média</b>')
  })
  it('tourné : un cadre repérable, le média couché et la surcouche droite', () => {
    const { container } = render(
      <RotatedMedia turned overlay={<i>sur</i>}>
        <b>média</b>
      </RotatedMedia>,
    )
    expect(container.querySelector('[data-rotated-frame]')).not.toBeNull()
    expect(screen.getByText('média')).toBeInTheDocument()
    expect(screen.getByText('sur')).toBeInTheDocument()
  })
})
