import { act, renderHook } from '@testing-library/react'
import { useDebounced } from './useDebounced'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebounced', () => {
  it('donne la première valeur tout de suite, les suivantes après le délai de calme', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 250), { initialProps: { value: 'a' } })
    expect(result.current).toBe('a')
    rerender({ value: 'b' })
    act(() => void vi.advanceTimersByTime(100))
    rerender({ value: 'c' })
    act(() => void vi.advanceTimersByTime(200))
    expect(result.current).toBe('a')
    act(() => void vi.advanceTimersByTime(50))
    expect(result.current).toBe('c')
  })
})
