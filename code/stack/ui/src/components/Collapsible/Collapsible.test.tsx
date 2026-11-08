import { fireEvent, render, screen } from '@testing-library/react'
import Collapsible from './Collapsible'
import { COMPACT_SUMMARY_CLASS, SUMMARY_CLASS } from './constants'

describe('Collapsible', () => {
  it('est ouvert par défaut et montre titre, détail et contenu', () => {
    const { container } = render(
      <Collapsible title="Salon" detail="2/3">
        <p>Lampes</p>
      </Collapsible>,
    )
    expect(container.querySelector('details')).toHaveAttribute('open')
    expect(screen.getByText('Salon')).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText('Lampes')).toBeInTheDocument()
  })

  it('peut démarrer replié', () => {
    const { container } = render(
      <Collapsible title="Salon" defaultOpen={false}>
        <p>Lampes</p>
      </Collapsible>,
    )
    expect(container.querySelector('details')).not.toHaveAttribute('open')
  })

  it('n affiche ni détail ni commandes sans eux', () => {
    const { container } = render(<Collapsible title="Salon">x</Collapsible>)
    expect(container.querySelectorAll('summary > span')).toHaveLength(1)
  })

  it('a deux gabarits de titre, normal et compact', () => {
    const { container, rerender } = render(<Collapsible title="A">x</Collapsible>)
    expect(container.querySelector('summary')).toHaveClass(...SUMMARY_CLASS.split(' ').slice(0, 1))
    expect(container.querySelector('summary')?.className).toBe(SUMMARY_CLASS)
    rerender(
      <Collapsible title="A" compact>
        x
      </Collapsible>,
    )
    expect(container.querySelector('summary')?.className).toBe(COMPACT_SUMMARY_CLASS)
  })

  it('ajoute la classe de tête du parent à celle du titre', () => {
    const { container, rerender } = render(<Collapsible title="A">x</Collapsible>)
    const base = container.querySelector('summary > span')?.className
    rerender(
      <Collapsible title="A" headClass="extra-head">
        x
      </Collapsible>,
    )
    expect(container.querySelector('summary > span')?.className).toBe(`${base} extra-head`)
  })

  it('un clic sur les commandes ne plie pas la section mais atteint le bouton', () => {
    const onClick = vi.fn()
    render(
      <Collapsible title="A" actions={<button onClick={onClick}>Go</button>}>
        x
      </Collapsible>,
    )
    const notPrevented = fireEvent.click(screen.getByText('Go'))
    expect(onClick).toHaveBeenCalledTimes(1)
    // fireEvent renvoie false si l action par défaut (plier) a été retenue.
    expect(notPrevented).toBe(false)
  })

  it('dit au parent quand on l’ouvre ou le ferme', () => {
    const onToggle = vi.fn()
    const { container } = render(
      <Collapsible title="Plan" defaultOpen={false} onToggle={onToggle}>
        contenu
      </Collapsible>,
    )
    const details = container.querySelector('details')!
    details.open = true
    fireEvent(details, new Event('toggle'))
    expect(onToggle).toHaveBeenLastCalledWith(true)
    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(onToggle).toHaveBeenLastCalledWith(false)
  })
})
