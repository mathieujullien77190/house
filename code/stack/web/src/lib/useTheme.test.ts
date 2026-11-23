import { act, renderHook } from '@testing-library/react'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('clair par défaut, et le dit à la page', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('reprend le choix gardé sur l’appareil', () => {
    localStorage.setItem('house-theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('en mode télé : toujours sombre, même si le clair est gardé', () => {
    sessionStorage.setItem('house-tv', '1')
    localStorage.setItem('house-theme', 'light')
    try {
      expect(renderHook(() => useTheme()).result.current.theme).toBe('dark')
    } finally {
      sessionStorage.clear()
    }
  })

  it('une autre valeur gardée donne le clair', () => {
    localStorage.setItem('house-theme', 'rose')
    expect(renderHook(() => useTheme()).result.current.theme).toBe('light')
  })

  it('le bouton bascule, garde le choix, et revient', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem('house-theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem('house-theme')).toBe('light')
  })

  it('sans stockage (lecture ou écriture refusée) : clair, et le choix ne survit pas mais la bascule marche', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
  })
})
