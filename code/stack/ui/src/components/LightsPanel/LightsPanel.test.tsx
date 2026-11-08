import { fireEvent, render, screen, within } from '@testing-library/react'
import LightsPanel from './LightsPanel'
import { briOf, countText, MAX_BRI, percentOf } from './helpers'
import type { LightsPanelProps, LightsRoom } from './types'
import { ALL_OFF_LABEL, ALL_ON_LABEL, BRIGHTNESS_LABEL, BUSY_LABEL, UNREACHABLE_TEXT } from './constants'

const salon: LightsRoom = {
  id: 'g1',
  name: 'Salon',
  on: true,
  bri: 254,
  lights: [
    { id: 'l1', name: 'Plafonnier', on: true, bri: 127, reachable: true },
    { id: 'l2', name: 'Lampadaire', on: false, bri: null, reachable: true },
    { id: 'l3', name: 'Veilleuse', on: false, bri: 10, reachable: false },
  ],
}

const handlers = () => ({ onAll: vi.fn(), onRoom: vi.fn(), onLight: vi.fn(), onDraft: vi.fn() })
const renderPanel = (extra: Partial<LightsPanelProps> = {}) => {
  const h = handlers()
  render(<LightsPanel rooms={[salon]} busy="" drafts={{}} {...h} {...extra} />)
  return h
}
const summary = () => screen.getByText('Salon').closest('summary') as HTMLElement
const tile = (name: string, state: 'ON' | 'OFF') => screen.getByRole('button', { name: `${name} ${state}` })

describe('helpers', () => {
  it('percentOf convertit 1 à 254 en 1 à 100, jamais sous 1', () => {
    expect(percentOf(254)).toBe(100)
    expect(percentOf(127)).toBe(50)
    expect(percentOf(0)).toBe(1)
  })

  it('briOf convertit 1 à 100 en 1 à 254, borné', () => {
    expect(briOf(100)).toBe(254)
    expect(briOf(50)).toBe(127)
    expect(briOf(0)).toBe(1)
    expect(briOf(500)).toBe(254)
  })

  it('la puissance max est 254', () => {
    expect(MAX_BRI).toBe(254)
  })

  it('countText compte les lampes allumées', () => {
    expect(countText(salon)).toBe('1/3 allumée(s)')
  })
})

describe('LightsPanel', () => {
  it('Tout allumer / Tout éteindre appellent onAll', () => {
    const h = renderPanel()
    fireEvent.click(screen.getByRole('button', { name: ALL_ON_LABEL }))
    fireEvent.click(screen.getByRole('button', { name: ALL_OFF_LABEL }))
    expect(h.onAll.mock.calls).toEqual([[true], [false]])
  })

  it('désactive les deux boutons généraux pendant l action « all »', () => {
    renderPanel({ busy: 'all' })
    expect(screen.getByRole('button', { name: ALL_ON_LABEL })).toBeDisabled()
    expect(screen.getByRole('button', { name: ALL_OFF_LABEL })).toBeDisabled()
  })

  it('montre la zone avec son compte, ouverte, et une case par lampe', () => {
    const { container } = render(<LightsPanel rooms={[salon]} busy="" drafts={{}} {...handlers()} />)
    expect(screen.getByText('1/3 allumée(s)')).toBeInTheDocument()
    expect(container.querySelector('details')).toHaveAttribute('open')
    expect(screen.getByText('Plafonnier')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('une case allumée est pressée et l éteint ; une éteinte l allume à puissance max', () => {
    const h = renderPanel()
    expect(tile('Plafonnier', 'ON')).toHaveAttribute('aria-pressed', 'true')
    expect(tile('Lampadaire', 'OFF')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(tile('Plafonnier', 'ON'))
    expect(h.onLight).toHaveBeenLastCalledWith('l1', { on: false })
    fireEvent.click(tile('Lampadaire', 'OFF'))
    expect(h.onLight).toHaveBeenLastCalledWith('l2', { on: true, bri: 254 })
  })

  it('les boutons ON et OFF de la zone commandent le groupe, ON à puissance max', () => {
    const h = renderPanel()
    fireEvent.click(within(summary()).getByRole('button', { name: 'ON' }))
    expect(h.onRoom).toHaveBeenLastCalledWith('g1', { on: true, bri: 254 })
    fireEvent.click(within(summary()).getByRole('button', { name: 'OFF' }))
    expect(h.onRoom).toHaveBeenLastCalledWith('g1', { on: false })
  })

  it('une lampe injoignable est signalée et sa case désactivée', () => {
    renderPanel()
    const button = tile('Veilleuse', 'OFF')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(UNREACHABLE_TEXT)
    expect(tile('Plafonnier', 'ON')).not.toHaveTextContent(UNREACHABLE_TEXT)
  })

  it('aucune case n a de curseur sans « dimmable »', () => {
    renderPanel()
    expect(screen.queryByRole('slider')).toBeNull()
  })

  it('pendant l action d une lampe, sa case montre « … » et est désactivée', () => {
    renderPanel({ busy: 'light:l1' })
    const button = tile('Plafonnier', 'ON')
    expect(button).toHaveTextContent(BUSY_LABEL)
    expect(button).toBeDisabled()
    expect(tile('Lampadaire', 'OFF')).toBeEnabled()
  })

  it('pendant l action d une zone, seuls ses boutons ON et OFF sont désactivés', () => {
    renderPanel({ busy: 'room:g1' })
    expect(within(summary()).getByRole('button', { name: 'ON' })).toBeDisabled()
    expect(within(summary()).getByRole('button', { name: 'OFF' })).toBeDisabled()
    expect(tile('Plafonnier', 'ON')).toBeEnabled()
  })

  it('les lampes à placer sont repliées et sans commande groupée', () => {
    const { container } = render(<LightsPanel rooms={[{ ...salon, ungrouped: true }]} busy="" drafts={{}} {...handlers()} />)
    expect(container.querySelector('details')).not.toHaveAttribute('open')
    expect(within(summary()).queryByRole('button')).toBeNull()
  })

  it('lampExtra s affiche sous la case d une lampe sans curseur', () => {
    renderPanel({ lampExtra: (light) => <button>Régler {light.name}</button> })
    const item = screen.getByRole('button', { name: 'Régler Plafonnier' }).closest('li') as HTMLElement
    expect(within(item).getByRole('button', { name: 'Plafonnier ON' })).toBeInTheDocument()
  })

  it('une zone sans lampe ni détecteur reste affichée', () => {
    renderPanel({ rooms: [{ ...salon, lights: [] }] })
    expect(screen.getByText('0/0 allumée(s)')).toBeInTheDocument()
  })
})

describe('LightsPanel : lampes à curseur', () => {
  const sliderOf = () => screen.getByRole('slider', { name: `${BRIGHTNESS_LABEL} Plafonnier` })

  it('seule la lampe « dimmable » a un curseur, avec son pourcentage', () => {
    renderPanel({ dimmable: ['l1'] })
    expect(screen.getAllByRole('slider')).toHaveLength(1)
    expect(sliderOf()).toHaveValue('50')
    expect(screen.getByText('50 %')).toBeInTheDocument()
    // Sa case reste un simple ON / OFF.
    expect(tile('Plafonnier', 'ON')).toBeInTheDocument()
  })

  it('le curseur montre le brouillon du parent', () => {
    renderPanel({ dimmable: ['l1'], drafts: { 'light:l1': 80 } })
    expect(sliderOf()).toHaveValue('80')
  })

  it('bouger le curseur envoie un brouillon ; le relâcher envoie la luminosité', () => {
    const h = renderPanel({ dimmable: ['l1'] })
    fireEvent.change(sliderOf(), { target: { value: '30' } })
    expect(h.onDraft).toHaveBeenCalledWith('light:l1', 30)
    fireEvent.pointerUp(sliderOf())
    expect(h.onLight).toHaveBeenLastCalledWith('l1', { bri: briOf(50) })
    fireEvent.keyUp(sliderOf(), { key: 'ArrowRight' })
    expect(h.onLight).toHaveBeenCalledTimes(2)
  })

  it('lampExtra est dans la ligne du curseur, pas sous la case', () => {
    renderPanel({ dimmable: ['l1'], lampExtra: (light) => <button>Régler {light.name}</button> })
    const extra = screen.getAllByRole('button', { name: 'Régler Plafonnier' })
    expect(extra).toHaveLength(1)
    expect(within(extra[0].closest('li') as HTMLElement).getByRole('slider')).toBeInTheDocument()
  })

  it('un curseur est désactivé pour une lampe injoignable', () => {
    renderPanel({ dimmable: ['l3'] })
    expect(screen.getByRole('slider')).toBeDisabled()
  })

  it('une lampe « dimmable » qui ne varie pas n a pas de curseur, mais garde sa ligne', () => {
    renderPanel({ dimmable: ['l2'], lampExtra: (light) => <i>extra {light.name}</i> })
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.getAllByText('extra Lampadaire')).toHaveLength(1)
  })
})

describe('LightsPanel : détecteurs', () => {
  it('montre les détecteurs : mouvement, calme, mesures, injoignable', () => {
    renderPanel({
      rooms: [
        {
          ...salon,
          sensors: [
            { id: 's1', name: 'Détecteur A', motion: true, motionText: 'Mouvement', readings: ['9,5 °C', '12 lx'], reachable: true },
            { id: 's2', name: 'Détecteur B', motion: false, motionText: 'Calme depuis 15:44', readings: [], reachable: false },
          ],
        },
      ],
    })
    const a = screen.getByText('Détecteur A').closest('li') as HTMLElement
    expect(within(a).getByText('Mouvement')).toBeInTheDocument()
    expect(within(a).getByText('9,5 °C')).toBeInTheDocument()
    expect(within(a).getByText('12 lx')).toBeInTheDocument()
    expect(a).not.toHaveTextContent(UNREACHABLE_TEXT)
    const b = screen.getByText('Détecteur B').closest('li') as HTMLElement
    expect(b).toHaveTextContent(UNREACHABLE_TEXT)
    expect(within(a).getByText('Mouvement').className).not.toBe(within(b).getByText('Calme depuis 15:44').className)
  })
})
