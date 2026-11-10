import { act, renderHook } from '@testing-library/react'
import { MARKERS_HIDDEN_KEY, useMarkersVisible } from './useMarkersVisible'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('useMarkersVisible', () => {
  it('montrés par défaut', () => {
    const { result } = renderHook(() => useMarkersVisible())
    expect(result.current.visible).toBe(true)
  })
  it('le choix de cacher est gardé puis relu', () => {
    const { result } = renderHook(() => useMarkersVisible())
    act(() => result.current.toggle())
    expect(result.current.visible).toBe(false)
    expect(localStorage.getItem(MARKERS_HIDDEN_KEY)).toBe('1')
    expect(renderHook(() => useMarkersVisible()).result.current.visible).toBe(false)
    act(() => result.current.toggle())
    expect(result.current.visible).toBe(true)
    expect(localStorage.getItem(MARKERS_HIDDEN_KEY)).toBe('0')
    expect(renderHook(() => useMarkersVisible()).result.current.visible).toBe(true)
  })
  it('un stockage refusé : montrés, et le choix vaut pour la page', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('refusé')
      },
      setItem: () => {
        throw new Error('refusé')
      },
    })
    const { result } = renderHook(() => useMarkersVisible())
    expect(result.current.visible).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.visible).toBe(false)
  })
})
