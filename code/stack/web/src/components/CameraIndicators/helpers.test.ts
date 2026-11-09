import type { HueLight, PlugState } from '@/types'
import { lampHint, lampLabel, plugHint, plugLabel, temperatureHint } from './helpers'

const lamp = (over: Partial<HueLight> = {}): HueLight => ({ id: '26', name: 'P', on: true, bri: 127, reachable: true, ...over })

describe('lampHint', () => {
  it('injoignable, éteinte, ou allumée avec sa luminosité en pourcentage', () => {
    expect(lampHint(lamp({ reachable: false }))).toBe('Lampe Perruche injoignable')
    expect(lampHint(lamp({ on: false }))).toBe('Lampe Perruche éteinte')
    expect(lampHint(lamp())).toBe('Lampe Perruche allumée à 50 %')
    expect(lampHint(lamp({ bri: 254 }))).toBe('Lampe Perruche allumée à 100 %')
  })
  it('une luminosité absente ou hors bornes est ramenée entre 0 et 100 %', () => {
    expect(lampHint(lamp({ bri: null }))).toBe('Lampe Perruche allumée à 0 %')
    expect(lampHint(lamp({ bri: 999 }))).toBe('Lampe Perruche allumée à 100 %')
    expect(lampHint(lamp({ bri: -5 }))).toBe('Lampe Perruche allumée à 0 %')
  })
})

describe('plugHint, temperatureHint, plugLabel, lampLabel', () => {
  it('le chauffage et les températures', () => {
    expect(plugHint({ on: true } as PlugState)).toBe('Chauffage allumé')
    expect(plugHint({ on: false } as PlugState)).toBe('Chauffage éteint')
    expect(temperatureHint(['9,5 °C'])).toBe('Température 9,5 °C')
    expect(temperatureHint(['9,5 °C', '12 °C'])).toBe('Température 9,5 °C · 12 °C')
    expect(plugLabel({ on: true } as PlugState)).toBe('Prise : allumée')
    expect(lampLabel(lamp({ on: false }))).toContain('éteinte')
  })
})
