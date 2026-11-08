import { fireEvent, render, screen, within } from '@testing-library/react'
import TopBar from './TopBar'
import { BURGER_LABEL, ERROR_CLASS, MOBILE_ERROR_CLASS, PANEL_ERROR_CLASS, PANEL_STATUS_CLASS, STATUS_CLASS } from './constants'

const tabs = (onChange = vi.fn(), value: 'a' | 'b' | '' = 'a') => ({
  label: 'Pages',
  options: [
    { id: 'a' as const, label: 'Accueil' },
    { id: 'b' as const, label: 'Clips' },
  ],
  value,
  onChange,
})

const burger = () => screen.getByRole('button', { name: BURGER_LABEL })

describe('TopBar sans menu', () => {
  it('montre le titre en texte simple et ni onglets ni sandwich', () => {
    render(<TopBar title="Maison" />)
    expect(screen.getByRole('heading', { name: 'Maison' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('rend le titre cliquable avec onTitle', () => {
    const onTitle = vi.fn()
    render(<TopBar title="Maison" onTitle={onTitle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Maison' }))
    expect(onTitle).toHaveBeenCalledTimes(1)
  })

  it('l état est discret, ou rouge en erreur (et répété sous la barre pour le téléphone)', () => {
    const { rerender } = render(<TopBar title="M" status="à jour" />)
    expect(screen.getByText('à jour').className).toBe(STATUS_CLASS)
    rerender(<TopBar title="M" status="panne" tone="error" />)
    const messages = screen.getAllByText('panne')
    expect(messages.map((message) => message.className)).toEqual([ERROR_CLASS, MOBILE_ERROR_CLASS])
  })

  it('sans état, une cale tient la place', () => {
    const { container } = render(<TopBar title="M" />)
    expect(container.querySelector('p')).toBeNull()
  })
})

describe('TopBar avec menu', () => {
  it('les onglets sont dans la barre et le sandwich est fermé', () => {
    render(<TopBar title="M" tabs={tabs()} />)
    expect(screen.getByRole('tablist', { name: 'Pages' })).toBeInTheDocument()
    expect(burger()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('le sandwich ouvre puis ferme le menu', () => {
    render(<TopBar title="M" tabs={tabs()} />)
    fireEvent.click(burger())
    expect(burger()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Pages' })).toBeInTheDocument()
    fireEvent.click(burger())
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('choisir une page la donne au parent, marque la page courante et ferme le menu', () => {
    const onChange = vi.fn()
    render(<TopBar title="M" tabs={tabs(onChange)} />)
    fireEvent.click(burger())
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('button', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('button', { name: 'Clips' })).not.toHaveAttribute('aria-current')
    fireEvent.click(within(nav).getByRole('button', { name: 'Clips' }))
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('avec seulement des boutons, le menu se nomme « Menu » et un clic sur un bouton le ferme', () => {
    const onAction = vi.fn()
    render(<TopBar title="M" actions={<button onClick={onAction}>Actualiser</button>} />)
    fireEvent.click(burger())
    const nav = screen.getByRole('navigation', { name: BURGER_LABEL })
    fireEvent.click(within(nav).getByRole('button', { name: 'Actualiser' }))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('les boutons sont aussi dans la barre sur grand écran', () => {
    render(<TopBar title="M" actions={<button>Actualiser</button>} />)
    expect(screen.getAllByRole('button', { name: 'Actualiser' })).toHaveLength(1)
    fireEvent.click(burger())
    expect(screen.getAllByRole('button', { name: 'Actualiser' })).toHaveLength(2)
  })

  it('le menu montre l état discret, ou l erreur', () => {
    const { rerender } = render(<TopBar title="M" tabs={tabs()} status="à jour" />)
    fireEvent.click(burger())
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByText('à jour').className).toBe(PANEL_STATUS_CLASS)
    rerender(<TopBar title="M" tabs={tabs()} status="panne" tone="error" />)
    expect(within(screen.getByRole('navigation')).getByText('panne').className).toBe(PANEL_ERROR_CLASS)
  })

  it('le menu sans état ni boutons ne montre que les pages', () => {
    render(<TopBar title="M" tabs={tabs()} />)
    fireEvent.click(burger())
    expect(screen.getByRole('navigation').querySelectorAll('p')).toHaveLength(0)
  })

  it('une valeur hors des pages n en marque aucune', () => {
    render(<TopBar title="M" tabs={tabs(vi.fn(), '')} />)
    fireEvent.click(burger())
    expect(within(screen.getByRole('navigation')).queryByRole('button', { current: 'page' })).toBeNull()
  })

  it('un appui hors de la barre ferme le menu, un appui dedans non', () => {
    render(
      <div>
        <TopBar title="M" tabs={tabs()} />
        <p>dehors</p>
      </div>,
    )
    fireEvent.click(burger())
    fireEvent.pointerDown(screen.getByRole('navigation'))
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByText('dehors'))
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('Échap ferme le menu, une autre touche non', () => {
    render(<TopBar title="M" tabs={tabs()} />)
    fireEvent.click(burger())
    fireEvent.keyDown(document, { key: 'a' })
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('retire ses écouteurs une fois fermé', () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    render(<TopBar title="M" tabs={tabs()} />)
    fireEvent.click(burger())
    fireEvent.click(burger())
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('si le parent retire les pages menu ouvert, le menu disparaît avec le sandwich', () => {
    const { rerender } = render(<TopBar title="M" tabs={tabs()} />)
    fireEvent.click(burger())
    rerender(<TopBar title="M" />)
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
