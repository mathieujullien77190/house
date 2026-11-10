import { fireEvent, render, screen, within } from '@testing-library/react'
import LightsPanel from './LightsPanel'
import { briOf, countText, MAX_BRI, orangeShare, percentOf, roomsOnFirst } from './helpers'
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

  it('chaque case dont la lampe varie a un curseur de luminosité sous elle ; la case garde son bouton', () => {
    const h = renderPanel()
    // Plafonnier (127) et Veilleuse (10) varient ; Lampadaire (bri null) n'a pas de curseur.
    expect(screen.getAllByRole('slider')).toHaveLength(2)
    const slider = screen.getByRole('slider', { name: `${BRIGHTNESS_LABEL} Plafonnier` })
    expect(slider).toHaveValue('50')
    expect(slider).toHaveAttribute('title', '50 %')
    // Le curseur reste bleu (couleur d'accent), allumée ou non : c'est la petite ampoule qui dit l'état.
    expect(slider.className).toContain('accent-accent')
    expect(screen.getByRole('slider', { name: `${BRIGHTNESS_LABEL} Veilleuse` }).className).toContain('accent-accent')
    expect(within(slider.closest('li') as HTMLElement).getByRole('button', { name: 'Plafonnier ON' })).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: `${BRIGHTNESS_LABEL} Lampadaire` })).toBeNull()
    fireEvent.change(slider, { target: { value: '30' } })
    expect(h.onDraft).toHaveBeenCalledWith('light:l1', 30)
    fireEvent.pointerUp(slider)
    expect(h.onLight).toHaveBeenLastCalledWith('l1', { bri: briOf(50) })
    fireEvent.keyUp(slider, { key: 'ArrowRight' })
    expect(h.onLight).toHaveBeenCalledTimes(2)
  })

  it('le curseur d’une case montre le brouillon du parent et est désactivé pour une lampe injoignable', () => {
    renderPanel({ drafts: { 'light:l1': 80 } })
    expect(screen.getByRole('slider', { name: `${BRIGHTNESS_LABEL} Plafonnier` })).toHaveValue('80')
    expect(screen.getByRole('slider', { name: `${BRIGHTNESS_LABEL} Veilleuse` })).toBeDisabled()
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

  it('lampExtra s affiche sous le bloc de la lampe, avec son curseur dedans', () => {
    renderPanel({ lampExtra: (light) => <button>Régler {light.name}</button> })
    const item = screen.getByRole('button', { name: 'Régler Plafonnier' }).closest('li') as HTMLElement
    expect(within(item).getByRole('button', { name: 'Plafonnier ON' })).toBeInTheDocument()
  })

  it('une zone sans lampe ni détecteur reste affichée', () => {
    renderPanel({ rooms: [{ ...salon, lights: [] }] })
    expect(screen.getByText('0/0 allumée(s)')).toBeInTheDocument()
  })
})

describe('LightsPanel : l’ordre des zones', () => {
  const zone = (id: string, on: boolean): LightsRoom => ({
    id,
    name: `Zone ${id}`,
    on,
    bri: null,
    lights: [
      { id: `${id}a`, name: `Lampe ${id}a`, on: false, bri: null, reachable: true },
      { id: `${id}b`, name: `Lampe ${id}b`, on, bri: null, reachable: true },
    ],
  })

  it('les zones qui ont une lampe allumée montent, les autres descendent ; les lampes ne changent jamais de place dans leur zone', () => {
    renderPanel({ rooms: [zone('1', false), zone('2', true), zone('3', false), zone('4', true)] })
    const zones = screen.getAllByText(/^Zone \d$/).map((element) => element.textContent)
    expect(zones).toEqual(['Zone 2', 'Zone 4', 'Zone 1', 'Zone 3'])
    // dans la zone 2, la lampe éteinte « a » reste avant l'allumée « b »
    const lamps = within(screen.getByText('Zone 2').closest('details') as HTMLElement).getAllByRole('button', { name: /Lampe 2/ })
    expect(lamps.map((button) => button.getAttribute('aria-label'))).toEqual(['Lampe 2a OFF', 'Lampe 2b ON'])
  })

  it('roomsOnFirst : ordre d’origine gardé dans chaque groupe', () => {
    expect(roomsOnFirst([zone('1', false), zone('2', true), zone('3', true), zone('4', false)]).map((room) => room.id)).toEqual(['2', '3', '1', '4'])
  })
})

describe('LightsPanel : la petite ampoule', () => {
  // La couleur est portée par le groupe de l'ampoule dans le rond.
  const bulbStyle = (id: string): string => screen.getByTestId(id).querySelector('g')?.getAttribute('style') ?? ''

  it('orangeShare : de 25 % (presque blanc) à 100 %', () => {
    expect(orangeShare(100)).toBe(100)
    expect(orangeShare(0)).toBe(25)
    expect(orangeShare(50)).toBeCloseTo(62.5)
    expect(orangeShare(500)).toBe(100)
    expect(orangeShare(-5)).toBe(25)
  })

  it('le bloc reste neutre ; l’ampoule en haut à droite est orange allumée, son jaune pâlit avec la luminosité (le curseur en cours compte tout de suite)', () => {
    const { rerender } = render(<LightsPanel rooms={[salon]} busy="" drafts={{}} {...handlers()} />)
    const bulb = () => bulbStyle('bulb-l1')
    const box = () => screen.getByRole('button', { name: 'Plafonnier ON' }).parentElement as HTMLElement
    // 127/254 = 50 % : 62,5 % d'orange, le reste blanc
    expect(bulb()).toContain('color-mix')
    expect(bulb()).toContain('62.5%')
    expect(bulb()).toContain('var(--color-orange)')
    // le bloc n'est pas colorié, mais sa bordure est jaune (couleur de l'ampoule) quand la lampe est allumée, et pâlit avec elle
    expect(box().style.backgroundColor).toBe('')
    expect(box().className).not.toContain('bg-orange')
    expect(box().style.borderColor).toContain('color-mix')
    expect(box().style.borderColor).toContain('62.5%')
    rerender(<LightsPanel rooms={[salon]} busy="" drafts={{ 'light:l1': 100 }} {...handlers()} />)
    expect(bulb()).toContain('100%')
    expect(box().style.borderColor).toContain('100%')
    rerender(<LightsPanel rooms={[salon]} busy="" drafts={{ 'light:l1': 5 }} {...handlers()} />)
    expect(bulb()).toContain('28.75%')
  })

  it('la couleur de la lampe, quand le pont la donne, colore l’ampoule ; sans luminosité, pleine couleur', () => {
    const room = { ...salon, lights: [{ id: 'c', name: 'Couleur', on: true, bri: null, reachable: true, color: '#33ccff' }] }
    render(<LightsPanel rooms={[room]} busy="" drafts={{}} {...handlers()} />)
    expect(bulbStyle('bulb-c')).toContain('rgb(51, 204, 255) 100%')
  })

  it('éteinte : ampoule grise ; injoignable : rouge', () => {
    renderPanel()
    // la bordure du bloc ne change que pour une lampe allumée
    expect((screen.getByRole('button', { name: 'Lampadaire OFF' }).parentElement as HTMLElement).style.borderColor).toBe('')
    expect(bulbStyle('bulb-l2')).toContain('--color-muted')
    expect(bulbStyle('bulb-l3')).toContain('--color-danger')
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
