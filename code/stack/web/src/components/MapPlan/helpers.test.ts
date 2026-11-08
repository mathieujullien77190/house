import { HOUSE_SHIFT } from '@/components/Lights/constants'
import { BRIGHTNESS_FLOOR, BRIGHTNESS_MAX, MAP_HOUSE_HEIGHT } from './constants'
import { bulbLabel, bulbOpacity, fromHousePlan, metersPerPixel, METERS_PER_DEGREE, offsetBy, waitingSlot } from './helpers'

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

describe('waitingSlot', () => {
  it('range les lampes en rangées sous la maison, 17 par rangée', () => {
    const first = waitingSlot(0)
    const next = waitingSlot(1)
    const wrapped = waitingSlot(17)
    expect(first.y).toBeGreaterThan(MAP_HOUSE_HEIGHT)
    expect(next.x).toBeGreaterThan(first.x)
    expect(next.y).toBe(first.y)
    expect(wrapped.x).toBe(first.x)
    expect(wrapped.y).toBeGreaterThan(first.y)
  })
})

describe('bulbOpacity', () => {
  it('suit la luminosité entre le plancher et le plein', () => {
    expect(bulbOpacity(true, true, BRIGHTNESS_MAX)).toBeCloseTo(1)
    expect(bulbOpacity(true, true, 0)).toBeCloseTo(BRIGHTNESS_FLOOR)
    const half = bulbOpacity(true, true, BRIGHTNESS_MAX / 2)
    expect(half).toBeGreaterThan(BRIGHTNESS_FLOOR)
    expect(half).toBeLessThan(1)
  })
  it('borne les luminosités hors échelle', () => {
    expect(bulbOpacity(true, true, BRIGHTNESS_MAX * 3)).toBeCloseTo(1)
    expect(bulbOpacity(true, true, -50)).toBeCloseTo(BRIGHTNESS_FLOOR)
  })
  it('pleine si éteinte, injoignable ou sans luminosité', () => {
    expect(bulbOpacity(false, true, 10)).toBe(1)
    expect(bulbOpacity(true, false, 10)).toBe(1)
    expect(bulbOpacity(true, true, null)).toBe(1)
    expect(bulbOpacity(true, true, undefined)).toBe(1)
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
