import { fireEvent, render, screen } from '@testing-library/react'
import Select from './Select'

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
]

const trigger = () => screen.getByRole('combobox', { name: 'Lettre' })
const key = (name: string) => fireEvent.keyDown(trigger(), { key: name })

const renderSelect = (value = 'b', onChange = vi.fn(), extra: { placeholder?: string; options?: typeof options } = {}) =>
  render(<Select label="Lettre" options={extra.options ?? options} value={value} onChange={onChange} placeholder={extra.placeholder} />)

describe('Select fermée', () => {
  it('montre le libellé de la valeur choisie', () => {
    renderSelect('b')
    expect(trigger()).toHaveTextContent('Bravo')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('montre le texte de remplacement hors des options (vide sans lui)', () => {
    const { unmount } = renderSelect('z', vi.fn(), { placeholder: 'Choisir' })
    expect(trigger()).toHaveTextContent('Choisir')
    unmount()
    renderSelect('z')
    expect(trigger().textContent).not.toContain('Alpha')
  })

  it('un clic ouvre la liste, un second la ferme', () => {
    renderSelect()
    fireEvent.click(trigger())
    expect(screen.getByRole('listbox', { name: 'Lettre' })).toBeInTheDocument()
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(trigger())
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('les touches de navigation et de validation l ouvrent', () => {
    for (const name of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ']) {
      const { unmount } = renderSelect()
      key(name)
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      unmount()
    }
  })

  it('une autre touche ne fait rien', () => {
    renderSelect()
    expect(fireEvent.keyDown(trigger(), { key: 'x' })).toBe(true)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('Échap sur une liste fermée reste fermée', () => {
    renderSelect()
    key('Escape')
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

describe('Select ouverte', () => {
  it('marque l option choisie et la surligne à l ouverture', () => {
    renderSelect('b')
    fireEvent.click(trigger())
    const items = screen.getAllByRole('option')
    expect(items.map((item) => item.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false'])
    expect(items[1]).toHaveTextContent('✓')
    expect(items[0]).not.toHaveTextContent('✓')
  })

  it('surligne la première option quand rien n est choisi', () => {
    const onChange = vi.fn()
    renderSelect('z', onChange)
    fireEvent.click(trigger())
    key('Enter')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('Entrée valide l option surlignée et ferme', () => {
    const onChange = vi.fn()
    renderSelect('a', onChange)
    key('ArrowDown')
    key('ArrowDown')
    key('Enter')
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('Espace valide aussi', () => {
    const onChange = vi.fn()
    renderSelect('a', onChange)
    key('ArrowDown')
    key(' ')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('les flèches sont bornées aux options', () => {
    const onChange = vi.fn()
    renderSelect('a', onChange)
    key('ArrowDown')
    key('ArrowUp')
    key('ArrowUp')
    key('Enter')
    expect(onChange).toHaveBeenLastCalledWith('a')
    key('ArrowDown')
    for (let i = 0; i < 5; i++) key('ArrowDown')
    key('Enter')
    expect(onChange).toHaveBeenLastCalledWith('c')
  })

  it('Début et Fin sautent aux extrémités', () => {
    const onChange = vi.fn()
    renderSelect('b', onChange)
    key('ArrowDown')
    key('End')
    key('Enter')
    expect(onChange).toHaveBeenLastCalledWith('c')
    key('ArrowDown')
    key('Home')
    key('Enter')
    expect(onChange).toHaveBeenLastCalledWith('a')
  })

  it('Échap ferme sans choisir', () => {
    const onChange = vi.fn()
    renderSelect('b', onChange)
    key('ArrowDown')
    key('Escape')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('la souris surligne, un clic choisit', () => {
    const onChange = vi.fn()
    renderSelect('a', onChange)
    fireEvent.click(trigger())
    fireEvent.pointerEnter(screen.getByRole('option', { name: 'Charlie' }))
    key('Enter')
    expect(onChange).toHaveBeenCalledWith('c')
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('option', { name: 'Bravo' }))
    expect(onChange).toHaveBeenLastCalledWith('b')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('sans option, valider ferme sans rien envoyer', () => {
    const onChange = vi.fn()
    renderSelect('a', onChange, { options: [] })
    key('ArrowDown')
    key('Enter')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('un appui hors de la liste la ferme, un appui dedans non', () => {
    render(
      <div>
        <Select label="Lettre" options={options} value="a" onChange={() => undefined} />
        <p>dehors</p>
      </div>,
    )
    fireEvent.click(trigger())
    fireEvent.pointerDown(screen.getByRole('listbox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByText('dehors'))
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
