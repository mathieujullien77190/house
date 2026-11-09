import { describeWeather, hourLabel, rainText } from './helpers'

describe('describeWeather', () => {
  it.each([
    [0, true, '☀️', 'Ensoleillé'],
    [0, false, '🌙', 'Ciel dégagé'],
    [1, true, '⛅', 'Éclaircies'],
    [2, false, '☁️', 'Nuageux'],
    [3, true, '☁️', 'Couvert'],
    [45, true, '🌫️', 'Brouillard'],
    [48, true, '🌫️', 'Brouillard'],
    [53, true, '💧', 'Bruine'],
    [61, true, '🌦️', 'Pluie faible'],
    [80, true, '🌦️', 'Pluie faible'],
    [65, true, '☔', 'Forte pluie'],
    [82, true, '☔', 'Forte pluie'],
    [63, true, '🌧️', 'Pluie'],
    [81, true, '🌧️', 'Pluie'],
    [73, true, '❄️', 'Neige'],
    [85, true, '❄️', 'Neige'],
    [95, true, '⛈️', 'Orage'],
    [10, true, '☁️', 'Nuageux'],
  ])('le code %i (jour : %s) : %s %s', (code, isDay, icon, label) => {
    expect(describeWeather(code, isDay)).toEqual({ icon, label })
  })
})

describe('hourLabel', () => {
  it('une heure ordinaire : « 14 h »', () => {
    expect(hourLabel('2026-11-10T14:00')).toBe('14 h')
    expect(hourLabel('2026-11-10T07:00')).toBe('7 h')
  })
  it('à minuit, le jour d’abord', () => {
    expect(hourLabel('2026-11-11T00:00')).toMatch(/^mer\.? 0 h$/)
  })
})

describe('rainText', () => {
  it('la chance de pluie, arrondie', () => {
    expect(rainText(70)).toBe('70 %')
    expect(rainText(12.6)).toBe('13 %')
  })
})
