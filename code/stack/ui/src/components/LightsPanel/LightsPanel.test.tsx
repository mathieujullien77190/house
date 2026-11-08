import { fireEvent, render, screen, within } from '@testing-library/react'
import LightsPanel from './LightsPanel'
import { briOf, countText, percentOf } from './helpers'
import type { LightsPanelProps, LightsRoom } from './types'
import { ALL_OFF_LABEL, ALL_ON_LABEL, BRIGHTNESS_LABEL, BUSY_LABEL, TURN_OFF_LABEL, TURN_ON_LABEL, UNREACHABLE_TEXT } from './constants'

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
const rowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement

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

  it('montre la pièce avec son compte, ouverte, et ses lampes', () => {
    const { container } = render(<LightsPanel rooms={[salon]} busy="" drafts={{}} {...handlers()} />)
    expect(screen.getByText('1/3 allumée(s)')).toBeInTheDocument()
    expect(container.querySelector('details')).toHaveAttribute('open')
    expect(screen.getByText('Plafonnier')).toBeInTheDocument()
  })

  it('le bouton d une lampe allumée l éteint, celui d une éteinte l allume', () => {
    const h = renderPanel()
    fireEvent.click(within(rowOf('Plafonnier')).getByRole('button', { name: TURN_OFF_LABEL }))
    expect(h.onLight).toHaveBeenLastCalledWith('l1', { on: false })
    fireEvent.click(within(rowOf('Lampadaire')).getByRole('button', { name: TURN_ON_LABEL }))
    expect(h.onLight).toHaveBeenLastCalledWith('l2', { on: true })
  })

  it('le bouton de la pièce commande le groupe', () => {
    const h = renderPanel()
    const summary = screen.getByText('Salon').closest('summary') as HTMLElement
    fireEvent.click(within(summary).getByRole('button', { name: TURN_OFF_LABEL }))
    expect(h.onRoom).toHaveBeenCalledWith('g1', { on: false })
  })

  it('une pièce éteinte propose d allumer', () => {
    const h = renderPanel({ rooms: [{ ...salon, on: false }] })
    const summary = screen.getByText('Salon').closest('summary') as HTMLElement
    fireEvent.click(within(summary).getByRole('button', { name: TURN_ON_LABEL }))
    expect(h.onRoom).toHaveBeenCalledWith('g1', { on: true })
  })

  it('une lampe injoignable est signalée et ses commandes sont désactivées', () => {
    renderPanel()
    const row = rowOf('Veilleuse')
    expect(row).toHaveTextContent(UNREACHABLE_TEXT)
    expect(within(row).getByRole('button')).toBeDisabled()
    expect(within(row).getByRole('slider')).toBeDisabled()
    expect(rowOf('Plafonnier')).not.toHaveTextContent(UNREACHABLE_TEXT)
  })

  it('une lampe qui ne varie pas n a pas de curseur', () => {
    renderPanel()
    expect(within(rowOf('Lampadaire')).queryByRole('slider')).toBeNull()
  })

  it('le curseur montre la luminosité en pourcentage, ou le brouillon du parent', () => {
    const { unmount } = render(<LightsPanel rooms={[salon]} busy="" drafts={{}} {...handlers()} />)
    const slider = within(rowOf('Plafonnier')).getByRole('slider', { name: BRIGHTNESS_LABEL })
    expect(slider).toHaveValue('50')
    expect(rowOf('Plafonnier')).toHaveTextContent('50 %')
    unmount()
    render(<LightsPanel rooms={[salon]} busy="" drafts={{ 'light:l1': 80 }} {...handlers()} />)
    expect(within(rowOf('Plafonnier')).getByRole('slider')).toHaveValue('80')
  })

  it('bouger le curseur envoie un brouillon ; le relâcher envoie la luminosité', () => {
    const h = renderPanel()
    const slider = within(rowOf('Plafonnier')).getByRole('slider')
    fireEvent.change(slider, { target: { value: '30' } })
    expect(h.onDraft).toHaveBeenCalledWith('light:l1', 30)
    fireEvent.pointerUp(slider)
    expect(h.onLight).toHaveBeenLastCalledWith('l1', { bri: briOf(50) })
    fireEvent.keyUp(slider, { key: 'ArrowRight' })
    expect(h.onLight).toHaveBeenCalledTimes(2)
  })

  it('le curseur de la pièce passe par onRoom', () => {
    const h = renderPanel()
    const summary = screen.getByText('Salon').closest('summary') as HTMLElement
    const slider = within(summary).getByRole('slider')
    fireEvent.change(slider, { target: { value: '40' } })
    expect(h.onDraft).toHaveBeenCalledWith('room:g1', 40)
    fireEvent.pointerUp(slider)
    expect(h.onRoom).toHaveBeenCalledWith('g1', { bri: 254 })
  })

  it('une pièce sans luminosité connue n a pas de curseur', () => {
    renderPanel({ rooms: [{ ...salon, bri: null }] })
    const summary = screen.getByText('Salon').closest('summary') as HTMLElement
    expect(within(summary).queryByRole('slider')).toBeNull()
  })

  it('pendant l action d une lampe, son bouton montre « … » et est désactivé', () => {
    renderPanel({ busy: 'light:l1' })
    const button = within(rowOf('Plafonnier')).getByRole('button')
    expect(button).toHaveTextContent(BUSY_LABEL)
    expect(button).toBeDisabled()
    expect(within(rowOf('Lampadaire')).getByRole('button')).toBeEnabled()
  })

  it('pendant l action d une pièce, seul son bouton est désactivé', () => {
    renderPanel({ busy: 'room:g1' })
    const summary = screen.getByText('Salon').closest('summary') as HTMLElement
    expect(within(summary).getByRole('button')).toBeDisabled()
    expect(within(rowOf('Plafonnier')).getByRole('button')).toBeEnabled()
  })

  it('les lampes à placer sont repliées et sans commande groupée', () => {
    const { container } = render(
      <LightsPanel rooms={[{ ...salon, ungrouped: true }]} busy="" drafts={{}} {...handlers()} />,
    )
    expect(container.querySelector('details')).not.toHaveAttribute('open')
    const summary = screen.getByText('Salon').closest('summary') as HTMLElement
    expect(within(summary).queryByRole('button')).toBeNull()
  })

  it('lampExtra ajoute ce que le parent choisit au bout de chaque lampe', () => {
    renderPanel({ lampExtra: (light) => <button>Régler {light.name}</button> })
    expect(within(rowOf('Plafonnier')).getByRole('button', { name: 'Régler Plafonnier' })).toBeInTheDocument()
  })

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
    const a = rowOf('Détecteur A')
    expect(within(a).getByText('Mouvement')).toBeInTheDocument()
    expect(within(a).getByText('9,5 °C')).toBeInTheDocument()
    expect(within(a).getByText('12 lx')).toBeInTheDocument()
    expect(a).not.toHaveTextContent(UNREACHABLE_TEXT)
    const b = rowOf('Détecteur B')
    expect(b).toHaveTextContent(UNREACHABLE_TEXT)
    // L état de mouvement change la couleur du texte.
    expect(within(a).getByText('Mouvement').className).not.toBe(within(b).getByText('Calme depuis 15:44').className)
  })

  it('une pièce sans lampe ni détecteur reste affichée', () => {
    renderPanel({ rooms: [{ ...salon, lights: [] }] })
    expect(screen.getByText('0/0 allumée(s)')).toBeInTheDocument()
  })
})
