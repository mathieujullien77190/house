import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { BRIGHTNESS_FLOOR, BRIGHTNESS_MAX, MAP_HOUSE_HEIGHT } from './constants'
import { bulbColor, bulbLabel, fromHousePlan, metersPerPixel, METERS_PER_DEGREE, offsetBy, temperatureText } from './helpers'

describe('MapPlan/helpers', () => {
  it('metersPerPixel diminue de moitié à chaque niveau de zoom et avec la latitude', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(156543.03392)
    expect(metersPerPixel(0, 1)).toBeCloseTo(metersPerPixel(0, 0) / 2)
    expect(metersPerPixel(60, 0)).toBeCloseTo(156543.03392 / 2)
  })
  it('offsetBy décale vers l’est et le sud', () => {
    const [lat, lng] = offsetBy([48, 2], 0, METERS_PER_DEGREE)
    expect(lat).toBeCloseTo(47)
    expect(lng).toBeCloseTo(2)
    const [, east] = offsetBy([0, 2], METERS_PER_DEGREE, 0)
    expect(east).toBeCloseTo(3)
  })
})

describe('fromHousePlan', () => {
  it('pousse la maison de HOUSE_SHIFT et allonge sa hauteur (300) jusqu’à celle de la carte', () => {
    expect(fromHousePlan(0, 0)).toEqual({ x: HOUSE_SHIFT, y: 0 })
    expect(fromHousePlan(100, 300)).toEqual({ x: 100 + HOUSE_SHIFT, y: MAP_HOUSE_HEIGHT })
  })
})

describe('bulbColor', () => {
  it('pleine luminosité : la couleur telle quelle (en #rrggbb)', () => {
    expect(bulbColor('#ffa85a', true, true, BRIGHTNESS_MAX)).toBe('#ffa85a')
    expect(bulbColor('#f80', true, true, BRIGHTNESS_MAX)).toBe('#ff8800')
  })
  it('seul le jaune pâlit : la luminosité baisse, la couleur se mêle de blanc, jamais au-delà du plancher', () => {
    const half = bulbColor('#ff8000', true, true, BRIGHTNESS_MAX / 2)
    const low = bulbColor('#ff8000', true, true, 0)
    const green = (hex: string) => Number.parseInt(hex.slice(3, 5), 16)
    expect(green(low)).toBeGreaterThan(green(half))
    expect(green(half)).toBeGreaterThan(green('#ff8000'))
    // au plancher, un quart de la couleur reste : le vert 0x80 donne 255 − 127 × 0,25
    expect(low).toBe(
      '#ffe0bf'
        .replace('e0', Math.round(255 - (255 - 0x80) * BRIGHTNESS_FLOOR).toString(16))
        .replace('bf', Math.round(255 - 255 * BRIGHTNESS_FLOOR).toString(16)),
    )
  })
  it('borne les luminosités hors échelle', () => {
    expect(bulbColor('#ff8000', true, true, BRIGHTNESS_MAX * 3)).toBe('#ff8000')
    expect(bulbColor('#ff8000', true, true, -50)).toBe(bulbColor('#ff8000', true, true, 0))
  })
  it('inchangée si éteinte, injoignable, sans luminosité ou d’une couleur inconnue', () => {
    expect(bulbColor('#ff8000', false, true, 10)).toBe('#ff8000')
    expect(bulbColor('#ff8000', true, false, 10)).toBe('#ff8000')
    expect(bulbColor('#ff8000', true, true, null)).toBe('#ff8000')
    expect(bulbColor('#ff8000', true, true, undefined)).toBe('#ff8000')
    expect(bulbColor('rgb(255, 128, 0)', true, true, 10)).toBe('rgb(255, 128, 0)')
  })
})

describe('bulbLabel', () => {
  it('ajoute le pourcentage quand la lampe est allumée et joignable', () => {
    expect(bulbLabel('Perruche', true, true, BRIGHTNESS_MAX * 0.6)).toBe('Perruche · 60 %')
  })
  it('juste le nom sinon', () => {
    expect(bulbLabel('P', false, true, 100)).toBe('P')
    expect(bulbLabel('P', true, false, 100)).toBe('P')
    expect(bulbLabel('P', true, true, null)).toBe('P')
    expect(bulbLabel('P', true, true, undefined)).toBe('P')
  })
})

describe('temperatureText', () => {
  it('écrit la valeur à la française, une décimale au plus', () => {
    expect(temperatureText(21)).toBe('21°')
    expect(temperatureText(21.54)).toBe('21,5°')
  })
})
