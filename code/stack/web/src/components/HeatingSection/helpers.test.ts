import type { HeatingLogEntry, HeatingStatus } from '@/types'
import { euros, frNumber, parseDecimal, rowOf, statusText, toBody, toForm, totalCost } from './helpers'

const status = (over: Partial<HeatingStatus> = {}): HeatingStatus => ({
  enabled: true,
  thresholdC: 3,
  minutes: 5,
  cooldownMinutes: 20,
  priceKwh: 0.1589,
  peakPriceKwh: 0.2142,
  offPeakStart: '23:10',
  offPeakEnd: '07:10',
  heaterWatts: 2000,
  lastActivationAt: null,
  nextAllowedAt: null,
  temperature: 1,
  night: true,
  cold: true,
  ...over,
})

describe('nombres', () => {
  it('frNumber met la virgule, euros garde deux à quatre décimales', () => {
    expect(frNumber(0.1589)).toBe('0,1589')
    expect(frNumber(3)).toBe('3')
    expect(frNumber(2.55, 1)).toBe('2,6')
    expect(euros(0.0265)).toBe('0,0265 €')
    expect(euros(0.03)).toBe('0,03 €')
  })
  it('parseDecimal accepte la virgule et le point, refuse le reste', () => {
    expect(parseDecimal('0,1589')).toBe(0.1589)
    expect(parseDecimal(' -2.5 ')).toBe(-2.5)
    expect(parseDecimal('3')).toBe(3)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
  })
})

describe('formulaire', () => {
  it('toForm écrit les réglages en champs, vides quand c’est inconnu', () => {
    expect(toForm(status())).toEqual({ threshold: '3', minutes: '5', cooldown: '20', price: '0,1589', peakPrice: '0,2142', offPeakStart: '23:10', offPeakEnd: '07:10', watts: '2000' })
    expect(toForm(status({ offPeakStart: null, offPeakEnd: null, heaterWatts: null }))).toMatchObject({ offPeakStart: '', offPeakEnd: '', watts: '' })
  })
  it('toBody relit les champs ; vides : heures et puissance inconnues', () => {
    const form = toForm(status())
    expect(toBody(form, false)).toEqual({
      enabled: false,
      thresholdC: 3,
      minutes: 5,
      cooldownMinutes: 20,
      priceKwh: 0.1589,
      peakPriceKwh: 0.2142,
      offPeakStart: '23:10',
      offPeakEnd: '07:10',
      heaterWatts: 2000,
    })
    expect(toBody({ ...form, offPeakStart: '', offPeakEnd: '', watts: '' }, true)).toMatchObject({ offPeakStart: null, offPeakEnd: null, heaterWatts: null })
  })
  it('toBody refuse ce qui n’est pas un nombre (ou pas un entier là où il en faut un)', () => {
    const form = toForm(status())
    for (const patch of [{ threshold: 'x' }, { minutes: '2,5' }, { minutes: '' }, { cooldown: 'x' }, { price: '' }, { peakPrice: 'x' }, { watts: '20x0' }, { watts: '1,5' }]) {
      expect(toBody({ ...form, ...patch }, true)).toBeNull()
    }
  })
})

describe('état et journal', () => {
  it('statusText dit ce que la règle ferait', () => {
    expect(statusText(status({ enabled: false }))).toBe('Règle désactivée')
    expect(statusText(status({ temperature: null }))).toBe('Température inconnue')
    expect(statusText(status({ night: false }))).toBe('Il fait jour')
    expect(statusText(status({ cold: false }))).toBe('Pas assez froid')
    expect(statusText(status())).toBe('Froid et nuit : la règle chauffera')
  })
  it('rowOf met une ligne en mots', () => {
    const entry: HeatingLogEntry = { at: 1_800_000_000, origin: 'auto', minutes: 5, temperature: 2.55, note: null, cost: 0.0265 }
    const row = rowOf(entry)
    expect(row).toMatchObject({ id: '1800000000-auto', origin: 'Automatique', duration: '5 min', temperature: '2,6 °C', cost: '0,0265 €' })
    expect(row.when).toMatch(/\d/)
    expect(rowOf({ ...entry, origin: 'manuel', temperature: null, cost: null })).toMatchObject({ origin: 'Manuel', temperature: '–', cost: '–' })
  })
  it('totalCost additionne les coûts connus, null s’il n’y en a aucun', () => {
    const entry = (cost: number | null): HeatingLogEntry => ({ at: 1, origin: 'auto', minutes: 5, temperature: null, note: null, cost })
    expect(totalCost([entry(0.5), entry(null), entry(0.25)])).toBe(0.75)
    expect(totalCost([entry(null)])).toBeNull()
    expect(totalCost([])).toBeNull()
  })
})
