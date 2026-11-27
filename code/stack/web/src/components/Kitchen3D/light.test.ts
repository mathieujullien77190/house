import { DEFAULT_LIGHT, LIGHT_KEY, loadLight, saveLight } from './light'

describe('loadLight, saveLight', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('à la première ouverture : plein jour', () => {
    expect(loadLight()).toBe('day')
    expect(DEFAULT_LIGHT).toBe('day')
  })

  it('le choix est gardé sur l’appareil et relu', () => {
    saveLight('now')
    expect(localStorage.getItem(LIGHT_KEY)).toBe('now')
    expect(loadLight()).toBe('now')
    saveLight('day')
    expect(loadLight()).toBe('day')
  })

  it('un choix qui n’a pas de sens reprend le plein jour', () => {
    localStorage.setItem(LIGHT_KEY, 'crépuscule')
    expect(loadLight()).toBe(DEFAULT_LIGHT)
    localStorage.setItem(LIGHT_KEY, '')
    expect(loadLight()).toBe(DEFAULT_LIGHT)
  })

  it('sans stockage : le plein jour, et garder ne casse rien', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('interdit')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('interdit')
    })
    expect(loadLight()).toBe(DEFAULT_LIGHT)
    expect(() => saveLight('now')).not.toThrow()
  })
})
