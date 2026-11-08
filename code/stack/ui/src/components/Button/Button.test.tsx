import { fireEvent, render, screen } from '@testing-library/react'
import Button from './Button'
import { buttonClass } from './helpers'
import { BASE_CLASS, VARIANT_CLASS } from './constants'

describe('buttonClass', () => {
  it('assemble la base, la variante et la classe en plus', () => {
    expect(buttonClass('active', 'w-full')).toBe(`${BASE_CLASS} ${VARIANT_CLASS.active} w-full`)
  })

  it('ne laisse pas d espace en fin sans classe en plus', () => {
    expect(buttonClass('danger')).toBe(`${BASE_CLASS} ${VARIANT_CLASS.danger}`)
  })
})

describe('Button', () => {
  it('est un type="button" par défaut (ne soumet pas un formulaire)', () => {
    render(<Button>Ok</Button>)
    expect(screen.getByRole('button', { name: 'Ok' })).toHaveAttribute('type', 'button')
  })

  it('accepte un autre type, une variante et une classe', () => {
    render(
      <Button type="submit" variant="active" className="extra">
        Envoyer
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Envoyer' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveClass('extra', 'bg-accent')
  })

  it('prend l apparence par défaut sans variante', () => {
    render(<Button>Ok</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-bg')
  })

  it('appelle onClick, sauf désactivé', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Ok</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(
      <Button onClick={onClick} disabled>
        Ok
      </Button>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
