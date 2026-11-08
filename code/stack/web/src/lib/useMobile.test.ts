import { act, renderHook } from '@testing-library/react'
import { useMobile } from './useMobile'

describe('useMobile', () => {
  it('suit la largeur de l’écran', () => {
    let matches = false
    let listener: () => void = () => undefined
    const remove = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return matches
        },
        addEventListener: (_: string, fn: () => void) => (listener = fn),
        removeEventListener: remove,
      })),
    )
    const { result, unmount } = renderHook(() => useMobile())
    expect(result.current).toBe(true)
    matches = true
    act(() => listener())
    expect(result.current).toBe(false)
    unmount()
    expect(remove).toHaveBeenCalled()
  })
})
