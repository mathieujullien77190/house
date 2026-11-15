import { stepValue } from './helpers'

describe('stepValue', () => {
  it('entier : pas de 1, jamais sous 0', () => {
    expect(stepValue('5', 'number', 1)).toBe('6')
    expect(stepValue('0', 'number', -1)).toBe('0')
  })

  it('décimal : pas de 0,5, négatif permis, virgule gardée', () => {
    expect(stepValue('-0.5', 'decimal', -1)).toBe('-1')
    expect(stepValue('1,5', 'decimal', 1)).toBe('2')
    expect(stepValue('1,0', 'decimal', 1)).toBe('1,5')
  })

  it('champ vide ou illisible : repart de 0', () => {
    expect(stepValue('', 'number', 1)).toBe('1')
    expect(stepValue('abc', 'decimal', 1)).toBe('0.5')
  })
})
