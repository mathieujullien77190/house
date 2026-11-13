import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Weather as WeatherData } from '@/lib/useWeather'
import Weather from './Weather'
import { ARROW_NEXT_LABEL, ARROW_PREVIOUS_LABEL, HOUSE_PLACE, PANEL_LABEL, SCROLL_STEP } from './constants'

const h = vi.hoisted(() => ({ weather: null as WeatherData | null, inside: null as number | null }))
vi.mock('@/lib/useWeather', () => ({ useWeather: () => h.weather }))
vi.mock('@/lib/useHomeTemperature', () => ({ useHomeTemperature: () => h.inside }))

// jsdom ne fait aucune mise en page : la géométrie de la liste est simulée.
const geometry = { left: 0, client: 300, total: 1000 }
const scrollBy = vi.fn()
Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, get: () => geometry.left })
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => geometry.client })
Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => geometry.total })
Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, writable: true, value: scrollBy })

const WEATHER: WeatherData = {
  temperature: 9.4,
  wind: 18,
  code: 61,
  isDay: true,
  hours: [
    { time: '2026-11-10T14:00', temperature: 9.4, code: 61, isDay: true, rainChance: 70, rain: 0.4, wind: 20 },
    { time: '2026-11-10T15:00', temperature: 10.2, code: 3, isDay: true, rainChance: 10, rain: 0, wind: 20 },
    { time: '2026-11-11T00:00', temperature: 6, code: 0, isDay: false, rainChance: 0, rain: 0, wind: 20 },
  ],
}

beforeEach(() => {
  h.weather = WEATHER
  h.inside = null
  geometry.left = 0
  geometry.client = 300
  geometry.total = 1000
  scrollBy.mockClear()
})

const button = () => screen.getByRole('button', { name: new RegExp(`^${HOUSE_PLACE}`) })
const open = () => fireEvent.click(button())

describe('Weather', () => {
  it('rien tant que la météo n’est pas lue', () => {
    h.weather = null
    const { container } = render(<Weather apiKey="k" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('fermée : le temps d’aujourd’hui seulement', () => {
    render(<Weather apiKey="k" />)
    expect(button()).toHaveAttribute('aria-expanded', 'false')
    expect(button()).toHaveTextContent('9°')
    expect(screen.queryByRole('region', { name: PANEL_LABEL })).toBeNull()
  })

  it('la température de la maison (le salon) suit celle de dehors, « 9° · 22° 🏠 » : un point entre les deux, l’emoji maison à droite, pas de nom de lieu ; rien tant qu’elle est inconnue', () => {
    render(<Weather apiKey="k" />)
    expect(button().querySelectorAll('svg')).toHaveLength(0)
    // pas d'emoji maison tant que la température de la maison est inconnue
    expect(button()).not.toHaveTextContent('🏠')
    cleanup()
    h.inside = 21.5
    render(<Weather apiKey="k" />)
    expect(button()).toHaveTextContent('9°')
    expect(button()).toHaveTextContent('22°')
    expect(button()).not.toHaveTextContent(HOUSE_PLACE)
    expect(button().querySelectorAll('svg')).toHaveLength(0)
    expect(button()).toHaveTextContent('·')
    expect(button()).not.toHaveTextContent('/')
    // l'emoji maison est à gauche de la température de la maison
    expect(button().textContent?.endsWith('🏠22°')).toBe(true)
    expect(button()).toHaveAttribute('aria-label', expect.stringContaining('intérieur 22 degrés'))
  })

  it('un clic ouvre les heures, un second les ferme', () => {
    render(<Weather apiKey="k" />)
    open()
    expect(button()).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('region', { name: PANEL_LABEL })
    expect(panel).toHaveTextContent('Maintenant')
    expect(panel).toHaveTextContent('15 h')
    expect(panel).toHaveTextContent(/0 h/)
    expect(panel).toHaveTextContent('70 %')
    expect(panel).toHaveTextContent('10°')
    open()
    expect(screen.queryByRole('region', { name: PANEL_LABEL })).toBeNull()
  })

  it('sans heures, rien à ouvrir', () => {
    h.weather = { ...WEATHER, hours: [] }
    render(<Weather apiKey="k" />)
    open()
    expect(screen.queryByRole('region', { name: PANEL_LABEL })).toBeNull()
  })

  it('Échap ferme, une autre touche non', () => {
    render(<Weather apiKey="k" />)
    open()
    fireEvent.keyDown(document, { key: 'a' })
    expect(screen.getByRole('region', { name: PANEL_LABEL })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: PANEL_LABEL })).toBeNull()
  })

  it('un clic ailleurs ferme, un clic dedans non', () => {
    render(<Weather apiKey="k" />)
    open()
    fireEvent.pointerDown(screen.getByRole('region', { name: PANEL_LABEL }))
    expect(screen.getByRole('region', { name: PANEL_LABEL })).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('region', { name: PANEL_LABEL })).toBeNull()
  })

  it('les flèches font défiler, et s’éteignent aux bouts de la liste', () => {
    render(<Weather apiKey="k" />)
    open()
    const previous = screen.getByRole('button', { name: ARROW_PREVIOUS_LABEL })
    const next = screen.getByRole('button', { name: ARROW_NEXT_LABEL })
    expect(previous).toBeDisabled()
    expect(next).not.toBeDisabled()
    fireEvent.click(next)
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 300 * SCROLL_STEP, behavior: 'smooth' })
    // la liste a défilé jusqu'au bout
    geometry.left = 700
    fireEvent.scroll(screen.getByRole('region', { name: PANEL_LABEL }).children[1])
    expect(previous).not.toBeDisabled()
    expect(next).toBeDisabled()
    fireEvent.click(previous)
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -300 * SCROLL_STEP, behavior: 'smooth' })
  })

  it('quand la fenêtre change de taille, les flèches sont relues', () => {
    render(<Weather apiKey="k" />)
    open()
    const next = screen.getByRole('button', { name: ARROW_NEXT_LABEL })
    expect(next).not.toBeDisabled()
    geometry.total = 250
    fireEvent(window, new Event('resize'))
    expect(next).toBeDisabled()
  })
})
