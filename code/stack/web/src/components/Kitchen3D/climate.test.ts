import { CLIMATE_KEY, DEFAULT_CLIMATE, loadClimate, saveClimate } from './climate'

describe('loadClimate, saveClimate', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('à la première ouverture : le printemps, du soleil, pas de vent', () => {
    expect(loadClimate()).toEqual({ season: 'spring', sky: 'sun', wind: false })
    expect(DEFAULT_CLIMATE).toEqual({ season: 'spring', sky: 'sun', wind: false })
  })

  it('le choix est gardé sur l’appareil et relu', () => {
    saveClimate({ season: 'auto', sky: 'snow', wind: true })
    expect(JSON.parse(localStorage.getItem(CLIMATE_KEY) ?? '')).toEqual({ season: 'auto', sky: 'snow', wind: true })
    expect(loadClimate()).toEqual({ season: 'auto', sky: 'snow', wind: true })
  })

  it('ce qui manque ou n’a pas de sens reprend sa valeur de départ', () => {
    localStorage.setItem(CLIMATE_KEY, JSON.stringify({ season: 'mousson', sky: 'rain', wind: 'oui' }))
    expect(loadClimate()).toEqual({ season: 'spring', sky: 'rain', wind: false })
    localStorage.setItem(CLIMATE_KEY, JSON.stringify({ season: 'winter', sky: 'grêle' }))
    expect(loadClimate()).toEqual({ season: 'winter', sky: 'sun', wind: false })
    localStorage.setItem(CLIMATE_KEY, 'null')
    expect(loadClimate()).toEqual(DEFAULT_CLIMATE)
    localStorage.setItem(CLIMATE_KEY, 'pas du JSON')
    expect(loadClimate()).toEqual(DEFAULT_CLIMATE)
  })

  it('sans stockage : le choix de départ, et garder ne casse rien', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('interdit')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('interdit')
    })
    expect(loadClimate()).toEqual(DEFAULT_CLIMATE)
    expect(() => saveClimate({ season: 'summer', sky: 'rain', wind: true })).not.toThrow()
  })
})
