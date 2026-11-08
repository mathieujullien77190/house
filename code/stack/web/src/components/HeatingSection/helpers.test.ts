import type { HeatingStatus } from '@/types'
import { frNumber, parseDecimal, toBody, toForm } from './helpers'

const status = (over: Partial<HeatingStatus> = {}): HeatingStatus => ({
  enabled: true,
  thresholdC: 3,
  minutes: 5,
  cooldownMinutes: 20,
  lastActivationAt: null,
  nextAllowedAt: null,
  temperature: 1,
  night: true,
  cold: true,
  ...over,
})

describe('nombres', () => {
  it('frNumber met la virgule', () => {
    expect(frNumber(0.1589)).toBe('0,1589')
    expect(frNumber(3)).toBe('3')
    expect(frNumber(2.55, 1)).toBe('2,6')
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
    expect(toForm(status())).toEqual({ threshold: '3', minutes: '5', cooldown: '20' })
  })
  it('toBody relit les champs ; vides : heures et puissance inconnues', () => {
    const form = toForm(status())
    expect(toBody(form, false)).toEqual({
      enabled: false,
      thresholdC: 3,
      minutes: 5,
      cooldownMinutes: 20,
        })
  })
  it('toBody refuse ce qui n’est pas un nombre (ou pas un entier là où il en faut un)', () => {
    const form = toForm(status())
    for (const patch of [{ threshold: 'x' }, { minutes: '2,5' }, { minutes: '' }, { cooldown: 'x' }]) {
      expect(toBody({ ...form, ...patch }, true)).toBeNull()
    }
  })
})
