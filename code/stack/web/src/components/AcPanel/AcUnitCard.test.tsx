import { fireEvent, render, screen } from '@testing-library/react'
import type { AcUnit } from '@/types'
import AcUnitCard from './AcUnitCard'
import { SEND_ERROR_TEXT, UNIT_UNREACHABLE_TEXT } from './constants'

const unit = (over: Partial<AcUnit> = {}): AcUnit => ({
  id: 'salon',
  name: 'Salon',
  reachable: true,
  power: true,
  mode: 'heat',
  targetTemp: 21,
  roomTemp: 19,
  fan: 'auto',
  vane: 'auto',
  wideVane: 'center',
  ...over,
})

describe('AcUnitCard', () => {
  it('chaque bouton envoie son changement', () => {
    const onChange = vi.fn()
    render(<AcUnitCard unit={unit()} busy={false} failed={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenLastCalledWith({ on: false })
    fireEvent.click(screen.getByRole('button', { name: '❄ Froid' }))
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'cool' })
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenLastCalledWith({ temperature: 21.5 })
    fireEvent.click(screen.getByRole('button', { name: '−' }))
    expect(onChange).toHaveBeenLastCalledWith({ temperature: 20.5 })
    fireEvent.click(screen.getByRole('button', { name: 'Silence' }))
    expect(onChange).toHaveBeenLastCalledWith({ fan: 'quiet' })
    // Le salon règle l'ailette haut / bas, pas gauche / droite.
    fireEvent.click(screen.getByRole('button', { name: '5 bas' }))
    expect(onChange).toHaveBeenLastCalledWith({ vane: '5' })
    expect(screen.queryByRole('button', { name: 'Droite' })).toBeNull()
    expect(screen.getByText('On')).toBeInTheDocument()
    expect(screen.queryByText(SEND_ERROR_TEXT)).toBeNull()
  })

  it('une chambre règle l’ailette gauche / droite, pas haut / bas', () => {
    const onChange = vi.fn()
    render(<AcUnitCard unit={unit({ id: 'chambre-matou', name: 'Chambre matou' })} busy={false} failed={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Droite' }))
    expect(onChange).toHaveBeenLastCalledWith({ wideVane: 'right' })
    // la position actuelle (« Milieu ») est en surbrillance
    expect(screen.getByRole('button', { name: 'Milieu' }).className).toContain('bg-accent')
    expect(screen.queryByRole('button', { name: '5 bas' })).toBeNull()
  })

  it('une unité éteinte s’allume au clic', () => {
    const onChange = vi.fn()
    render(<AcUnitCard unit={unit({ power: false })} busy={false} failed={false} onChange={onChange} />)
    expect(screen.getByText('Off')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith({ on: true })
  })

  it('occupée : les boutons sont grisés ; échec : le message s’affiche', () => {
    render(<AcUnitCard unit={unit()} busy failed onChange={vi.fn()} />)
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByRole('button', { name: '+' })).toBeDisabled()
    expect(screen.getByText(SEND_ERROR_TEXT)).toBeInTheDocument()
  })

  it('sans consigne connue, − et + sont grisés', () => {
    const onChange = vi.fn()
    render(<AcUnitCard unit={unit({ targetTemp: null })} busy={false} failed={false} onChange={onChange} />)
    expect(screen.getByRole('button', { name: '+' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '−' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('injoignable : le message remplace les commandes', () => {
    render(<AcUnitCard unit={unit({ reachable: false })} busy={false} failed={false} onChange={vi.fn()} />)
    expect(screen.getByText(UNIT_UNREACHABLE_TEXT)).toBeInTheDocument()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('withVanes faux : pas de réglage d’ailette', () => {
    render(<AcUnitCard unit={unit()} busy={false} failed={false} onChange={vi.fn()} withVanes={false} />)
    expect(screen.queryByRole('button', { name: '5 bas' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Droite' })).toBeNull()
  })

  it('modes : seuls les modes permis ont un bouton', () => {
    render(<AcUnitCard unit={unit({ mode: 'dry' })} busy={false} failed={false} onChange={vi.fn()} modes={['heat', 'cool']} />)
    expect(screen.getByRole('button', { name: '❄ Froid' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sec/ })).toBeNull()
  })

  it('range : la consigne reste dans la plage et − / + sont grisés aux bornes', () => {
    const onChange = vi.fn()
    const range = { min: 18, max: 24 }
    const { rerender } = render(<AcUnitCard unit={unit({ targetTemp: 24 })} busy={false} failed={false} onChange={onChange} range={range} />)
    expect(screen.getByRole('button', { name: '+' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '−' })).not.toBeDisabled()
    rerender(<AcUnitCard unit={unit({ targetTemp: 18 })} busy={false} failed={false} onChange={onChange} range={range} />)
    expect(screen.getByRole('button', { name: '−' })).toBeDisabled()
    rerender(<AcUnitCard unit={unit({ targetTemp: 23.8 })} busy={false} failed={false} onChange={onChange} range={range} />)
    fireEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenLastCalledWith({ temperature: 24 })
    rerender(<AcUnitCard unit={unit({ targetTemp: 18.2 })} busy={false} failed={false} onChange={onChange} range={range} />)
    fireEvent.click(screen.getByRole('button', { name: '−' }))
    expect(onChange).toHaveBeenLastCalledWith({ temperature: 18 })
    // Une consigne hors plage (26) : « + » grisé, « − » ramène dans la plage.
    rerender(<AcUnitCard unit={unit({ targetTemp: 26 })} busy={false} failed={false} onChange={onChange} range={range} />)
    fireEvent.click(screen.getByRole('button', { name: '−' }))
    expect(onChange).toHaveBeenLastCalledWith({ temperature: 24 })
  })
})
