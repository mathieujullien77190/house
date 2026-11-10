import type { AcUnit } from '@/types'
import { degrees, stateText, stepTarget } from './helpers'

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
  wideVane: null,
  ...over,
})

describe('degrees', () => {
  it('écrit la température à la française, ou un tiret si inconnue', () => {
    expect(degrees(22.5)).toMatch(/^22,5\s°C$/)
    expect(degrees(null)).toBe('–')
  })
})

describe('stateText', () => {
  it('résume allumée, mode et température de la pièce', () => {
    expect(stateText(unit())).toMatch(/^Allumée · Chaud · pièce 19\s°C$/)
  })

  it('omet le mode et la pièce inconnus', () => {
    expect(stateText(unit({ power: false, mode: null, roomTemp: null }))).toBe('Éteinte')
  })
})

describe('stepTarget', () => {
  it('avance d’un demi-degré, bornée entre 16 et 31', () => {
    expect(stepTarget(21, 1)).toBe(21.5)
    expect(stepTarget(21, -1)).toBe(20.5)
    expect(stepTarget(31, 1)).toBe(31)
    expect(stepTarget(16, -1)).toBe(16)
  })
})
